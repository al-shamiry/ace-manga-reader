use std::collections::{HashMap, HashSet};
use std::ffi::OsString;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use rayon::prelude::*;
use tauri::Manager;

use crate::error::{AppError, AppResult};
use crate::infra::archive;
use crate::infra::image::{images_in, subdirs_and_cbz};
use crate::infra::naming::{natural_cmp, normalize, now_epoch, path_id, title_from_path};
use crate::infra::paths;
use crate::models::{ChapterStatus, MangaDb, MangaDto, MangaRecord, SourceDto, SourceRecord};
use crate::store::db::{self, MangaDbCache};
use crate::store::history;

/// Find the cover from explicit cover files or first issue's first image.
fn find_folder_cover(manga_path: &Path, sub_dirs: &[PathBuf]) -> Option<String> {
    for name in &["cover.png", "cover.jpg", "cover.jpeg", "cover.webp"] {
        let candidate = manga_path.join(name);
        if candidate.is_file() {
            return Some(normalize(&candidate));
        }
    }
    let first_issue = sub_dirs.first()?;
    let first_image = images_in(first_issue).into_iter().next()?;
    Some(normalize(&first_image))
}

/// Scan a manga folder that may contain CBZ files, image subdirs, or both.
/// Returns `None` if the folder has no chapters.
fn scan_manga(path: &Path, cache_dir: &Path) -> Option<AppResult<MangaDto>> {
    let (sub_dirs, cbz_files) = subdirs_and_cbz(path);
    let chapter_count = sub_dirs.len() + cbz_files.len();

    if chapter_count == 0 {
        return None;
    }

    let id = path_id(path);

    // Cover priority: explicit cover file > first image subdir > first CBZ
    let cover_result = find_folder_cover(path, &sub_dirs)
        .map(Ok)
        .or_else(|| cbz_files.first().map(|cbz| archive::extract_cover(cbz, &id, cache_dir)));

    let cover_path = match cover_result {
        Some(Ok(p)) => p,
        Some(Err(e)) => return Some(Err(e)),
        None => return Some(Err(AppError::Invalid("No cover found".to_string()))),
    };

    Some(Ok(MangaDto {
        id,
        title: title_from_path(path),
        path: normalize(path),
        cover_path,
        chapter_count,
        read_chapters: 0,
        last_read_at: 0,
        category_ids: Vec::new(),
        added_at: 0,
    }))
}

/// Collect all mangas found within `dir`, searching up to `depth` levels deep.
fn collect_mangas(dir: &Path, depth: u32, cache_dir: &Path) -> Vec<MangaDto> {
    let entries: Vec<PathBuf> = match fs::read_dir(dir) {
        Ok(rd) => rd.filter_map(|e| e.ok()).map(|e| e.path()).filter(|p| p.is_dir()).collect(),
        Err(e) => {
            eprintln!("Cannot read {:?}: {}", dir, e);
            return Vec::new();
        }
    };

    entries
        .par_iter()
        .flat_map(|entry| match scan_manga(entry, cache_dir) {
            Some(Ok(manga)) => vec![manga],
            Some(Err(e)) => {
                eprintln!("Skipping manga {:?}: {}", entry, e);
                vec![]
            }
            None if depth > 0 => collect_mangas(entry, depth - 1, cache_dir),
            None => vec![],
        })
        .collect()
}

/// Count mangas by immediate subdirectory count in the source directory.
fn count_mangas(dir: &Path) -> usize {
    fs::read_dir(dir)
        .map(|rd| rd.filter_map(|e| e.ok()).filter(|e| e.path().is_dir()).count())
        .unwrap_or(0)
}

/// Project all mangas belonging to `source_id`, sorted by natural title order.
fn mangas_for_source(db: &MangaDb, source_id: &str) -> Vec<MangaDto> {
    let mut mangas: Vec<MangaDto> = db
        .mangas
        .iter()
        .filter(|(_, manga)| manga.source_id == source_id)
        .map(|(id, manga)| manga.project(id.as_str()))
        .collect();
    mangas.sort_by(|a, b| natural_cmp(&a.title, &b.title));
    mangas
}

#[tauri::command]
pub fn list_sources(
    include_hidden: Option<bool>,
    app: tauri::AppHandle,
) -> AppResult<Vec<SourceDto>> {
    let include_hidden = include_hidden.unwrap_or(false);
    let cache = app.state::<Mutex<MangaDbCache>>();
    let guard = db::lock(&cache)?;

    let mut sources: Vec<SourceDto> = guard.db.sources.iter()
        .filter(|(_, source)| include_hidden || !source.hidden)
        .map(|(id, source)| source.project(id.as_str()))
        .collect();

    sources.sort_by_key(|s| s.sort_order);
    Ok(sources)
}

#[tauri::command]
pub fn scan_directory(
    path: String,
    force_refresh: bool,
    app: tauri::AppHandle,
) -> AppResult<Vec<MangaDto>> {
    let dir = Path::new(&path);
    if !dir.is_dir() {
        return Err(AppError::Invalid(format!("'{}' is not a directory", path)));
    }

    let source_id = path_id(dir);
    let cache = app.state::<Mutex<MangaDbCache>>();

    // Cache hit: source is known and we have mangas for it → return directly
    if !force_refresh {
        let guard = db::lock(&cache)?;
        if guard.db.sources.contains_key(&source_id)
            && guard.db.mangas.values().any(|m| m.source_id == source_id)
        {
            return Ok(mangas_for_source(&guard.db, &source_id));
        }
    }

    // Full disk scan
    let covers_dir = paths::covers_dir(&app)?;
    fs::create_dir_all(&covers_dir)?;
    let mangas = collect_mangas(dir, 1, &covers_dir);

    let scanned_at = now_epoch();
    db::mutate(&cache, &app, |db| {
        sync_source_mangas(db, &source_id, dir, scanned_at, &mangas);
    })?;

    let guard = db::lock(&cache)?;
    Ok(mangas_for_source(&guard.db, &source_id))
}

/// Reconcile a source and its mangas against a fresh disk scan: upsert the
/// source metadata (preserving user-controlled fields), drop mangas that
/// vanished from disk, and refresh display fields while keeping reading state.
fn sync_source_mangas(
    db: &mut MangaDb,
    source_id: &str,
    dir: &Path,
    scanned_at: u64,
    mangas: &[MangaDto],
) {
    let on_disk_ids: HashSet<&str> = mangas.iter().map(|m| m.id.as_str()).collect();
    let manga_count = on_disk_ids.len();
    let source_path = normalize(dir);

    if let Some(existing) = db.sources.get_mut(source_id) {
        existing.path = source_path;
        existing.scanned_at = scanned_at;
        existing.manga_count = manga_count;
    } else {
        let mut record = SourceRecord::new(
            source_path,
            resolve_source_name(dir, None),
            manga_count,
            db.next_source_order(),
        );
        record.scanned_at = scanned_at;
        db.sources.insert(source_id.to_string(), record);
    }

    db.mangas
        .retain(|id, m| m.source_id != source_id || on_disk_ids.contains(id.as_str()));

    for manga in mangas {
        let entry = db.mangas.entry(manga.id.clone()).or_default();
        entry.source_id = source_id.to_string();
        entry.title = manga.title.clone();
        entry.path = manga.path.clone();
        entry.cover_path = manga.cover_path.clone();
        entry.chapter_count = manga.chapter_count;
    }
}

// ── Source CRUD helpers ───────────────────────────────────────────────────────

fn project_source(db: &MangaDb, id: &str) -> AppResult<SourceDto> {
    db.sources
        .get(id)
        .map(|source| source.project(id))
        .ok_or_else(|| AppError::NotFound(format!("source '{}' not found", id)))
}

fn rebase_under_root(path: &str, old_root: &str, new_root: &str) -> String {
    let old_root = old_root.trim_end_matches('/');
    let new_root = new_root.trim_end_matches('/');
    if path == old_root {
        return new_root.to_string();
    }
    let prefix = format!("{}/", old_root);
    if let Some(rest) = path.strip_prefix(&prefix) {
        return format!("{}/{}", new_root, rest);
    }
    path.to_string()
}

fn rekey_cached_cover_path(path: &str, old_manga_id: &str, new_manga_id: &str) -> String {
    if old_manga_id == new_manga_id {
        return path.to_string();
    }
    let current = Path::new(path);
    let Some(stem) = current.file_stem().and_then(|s| s.to_str()) else {
        return path.to_string();
    };
    if stem != old_manga_id {
        return path.to_string();
    }
    let Some(parent) = current.parent() else {
        return path.to_string();
    };
    let new_name = match current.extension().and_then(|e| e.to_str()) {
        Some(ext) => format!("{}.{}", new_manga_id, ext),
        None => new_manga_id.to_string(),
    };
    normalize(&parent.join(new_name))
}

fn remap_chapter_statuses(
    old_manga_path: &Path,
    new_manga_path: &Path,
    old_chapters: &HashMap<String, ChapterStatus>,
) -> HashMap<String, ChapterStatus> {
    if old_chapters.is_empty() {
        return old_chapters.clone();
    }

    let (sub_dirs, cbz_files) = subdirs_and_cbz(new_manga_path);
    let mut remapped: HashMap<String, ChapterStatus> = HashMap::new();

    for chapter in sub_dirs.iter().chain(cbz_files.iter()) {
        let Some(name) = chapter.file_name() else {
            continue;
        };
        let old_chapter_id = path_id(&old_manga_path.join(name));
        if let Some(status) = old_chapters.get(&old_chapter_id) {
            remapped.insert(path_id(chapter), status.clone());
        }
    }

    remapped
}

/// The on-disk folder name for a manga, falling back to its title.
fn manga_folder_name(record: &MangaRecord) -> OsString {
    Path::new(&record.path)
        .file_name()
        .map(|name| name.to_os_string())
        .unwrap_or_else(|| OsString::from(&record.title))
}

/// Ensure every manga folder for the source still exists under `new_dir`,
/// reporting the missing ones. Read-only — call before committing a relocation.
fn validate_relocation_targets(
    db: &MangaDb,
    new_dir: &Path,
    source_manga_ids: &[String],
) -> AppResult<()> {
    let missing: Vec<String> = source_manga_ids
        .iter()
        .filter_map(|id| db.mangas.get(id))
        .filter(|record| !new_dir.join(manga_folder_name(record)).is_dir())
        .map(|record| record.title.clone())
        .collect();

    if missing.is_empty() {
        return Ok(());
    }

    let count = missing.len();
    let preview = missing.iter().take(5).cloned().collect::<Vec<_>>().join(", ");
    let suffix = if count > 5 { format!(" and {} more", count - 5) } else { String::new() };
    Err(AppError::Invalid(format!(
        "Cannot relocate: {} manga folder{} missing at the new path: {}{}",
        count,
        if count == 1 { "" } else { "s" },
        preview,
        suffix,
    )))
}

/// Rewrite one manga record for its new location: new path/id, rebased cover
/// paths, and remapped chapter statuses. Returns `(new_manga_id, record)`.
fn remap_manga(
    existing: &MangaRecord,
    old_manga_id: &str,
    new_dir: &Path,
    old_source_path: &str,
    new_source_path: &str,
    new_source_id: &str,
) -> (String, MangaRecord) {
    let old_manga_path = PathBuf::from(&existing.path);
    let new_manga_path = new_dir.join(manga_folder_name(existing));
    let new_manga_id = path_id(&new_manga_path);

    let mut updated = existing.clone();
    updated.source_id = new_source_id.to_string();
    updated.path = normalize(&new_manga_path);
    updated.cover_path = rekey_cached_cover_path(
        &rebase_under_root(&existing.cover_path, old_source_path, new_source_path),
        old_manga_id,
        &new_manga_id,
    );

    if let Some(override_path) = &existing.cover_override {
        let rebased = rebase_under_root(override_path, old_source_path, new_source_path);
        updated.cover_override = Some(rekey_cached_cover_path(&rebased, old_manga_id, &new_manga_id));
    }

    updated.chapters = remap_chapter_statuses(&old_manga_path, &new_manga_path, &existing.chapters);
    updated.read_chapters = updated
        .chapters
        .values()
        .filter(|s| matches!(s, ChapterStatus::Read))
        .count();

    (new_manga_id, updated)
}

/// Resolve a source's display name: the trimmed override, else the folder name.
fn resolve_source_name(dir: &Path, name: Option<String>) -> String {
    name.filter(|s| !s.trim().is_empty()).unwrap_or_else(|| {
        dir.file_name().and_then(|s| s.to_str()).unwrap_or("Untitled").to_string()
    })
}

/// Insert a source for `dir` if one doesn't already exist. Returns its id either way.
fn ensure_source(app: &tauri::AppHandle, dir: &Path, name: Option<String>) -> AppResult<String> {
    let id = path_id(dir);
    let cache = app.state::<Mutex<MangaDbCache>>();
    {
        let guard = db::lock(&cache)?;
        if guard.db.sources.contains_key(&id) {
            return Ok(id);
        }
    }

    let source_path = normalize(dir);
    let resolved_name = resolve_source_name(dir, name);
    let manga_count = count_mangas(dir);
    db::mutate(&cache, app, |db| {
        // Re-check under the lock: another caller may have inserted it meanwhile.
        if !db.sources.contains_key(&id) {
            let order = db.next_source_order();
            db.sources
                .insert(id.clone(), SourceRecord::new(source_path, resolved_name, manga_count, order));
        }
    })?;
    Ok(id)
}

// ── Source CRUD commands ──────────────────────────────────────────────────────

#[tauri::command]
pub fn add_source(
    path: String,
    name: Option<String>,
    app: tauri::AppHandle,
) -> AppResult<SourceDto> {
    let dir = Path::new(&path);
    if !dir.is_dir() {
        return Err(AppError::Invalid(format!("'{}' is not a directory", path)));
    }

    let id = ensure_source(&app, dir, name)?;
    let cache = app.state::<Mutex<MangaDbCache>>();
    let guard = db::lock(&cache)?;
    project_source(&guard.db, &id)
}

#[tauri::command]
pub fn relocate_source(
    source_id: String,
    new_path: String,
    app: tauri::AppHandle,
) -> AppResult<SourceDto> {
    let new_dir = Path::new(&new_path);
    if !new_dir.is_dir() {
        return Err(AppError::Invalid(format!("'{}' is not a directory", new_path)));
    }

    let normalized_new_path = normalize(new_dir);
    let new_source_id = path_id(new_dir);
    let cache = app.state::<Mutex<MangaDbCache>>();

    let id_map: HashMap<String, String> = {
        let mut guard = db::lock(&cache)?;

        if !guard.db.sources.contains_key(&source_id) {
            return Err(AppError::NotFound(format!("source '{}' not found", source_id)));
        }
        if new_source_id != source_id && guard.db.sources.contains_key(&new_source_id) {
            return Err(AppError::Invalid(
                "A source already exists for that folder".to_string(),
            ));
        }

        let source_manga_ids: Vec<String> = guard
            .db
            .mangas
            .iter()
            .filter(|(_, manga)| manga.source_id == source_id)
            .map(|(id, _)| id.clone())
            .collect();
        let source_manga_set: HashSet<String> = source_manga_ids.iter().cloned().collect();

        // Validate everything before mutating any state.
        validate_relocation_targets(&guard.db, new_dir, &source_manga_ids)?;
        let old_source_path = guard.db.sources[&source_id].path.clone();

        // Build the remapped mangas, rejecting any folder-name collisions.
        let mut remapped_mangas: Vec<(String, MangaRecord)> = Vec::new();
        let mut id_map: HashMap<String, String> = HashMap::new();
        let mut used_new_manga_ids: HashSet<String> = HashSet::new();

        for old_manga_id in &source_manga_ids {
            let Some(existing) = guard.db.mangas.get(old_manga_id).cloned() else {
                continue;
            };
            let (new_manga_id, updated) = remap_manga(
                &existing,
                old_manga_id,
                new_dir,
                &old_source_path,
                &normalized_new_path,
                &new_source_id,
            );

            if !used_new_manga_ids.insert(new_manga_id.clone()) {
                return Err(AppError::Invalid(format!(
                    "Multiple mangas would map to '{}'; rename folders before relocating.",
                    updated.path
                )));
            }
            if new_manga_id != *old_manga_id
                && guard.db.mangas.contains_key(&new_manga_id)
                && !source_manga_set.contains(&new_manga_id)
            {
                return Err(AppError::Invalid(format!(
                    "Manga ID collision while relocating '{}'.",
                    existing.title
                )));
            }

            id_map.insert(old_manga_id.clone(), new_manga_id.clone());
            remapped_mangas.push((new_manga_id, updated));
        }

        // Commit: swap the mangas and move the source record to its new id.
        let mut source_meta = guard
            .db
            .sources
            .remove(&source_id)
            .ok_or_else(|| AppError::NotFound(format!("source '{}' not found", source_id)))?;
        for old_manga_id in &source_manga_ids {
            guard.db.mangas.remove(old_manga_id);
        }
        for (new_manga_id, record) in remapped_mangas {
            guard.db.mangas.insert(new_manga_id, record);
        }
        source_meta.path = normalized_new_path.clone();
        source_meta.manga_count = source_manga_ids.len();
        guard.db.sources.insert(new_source_id.clone(), source_meta);

        db::save_db(&app, &guard.db)?;
        id_map
    };

    history::rekey_mangas(&app, &id_map)?;
    if let Err(e) = rename_cached_covers(&app, &id_map) {
        eprintln!("rename_cached_covers failed: {}", e);
    }

    let guard = db::lock(&cache)?;
    project_source(&guard.db, &new_source_id)
}

#[tauri::command]
pub fn remove_source(source_id: String, app: tauri::AppHandle) -> AppResult<()> {
    let (manga_ids, chapter_ids): (Vec<String>, Vec<String>) = {
        let cache = app.state::<Mutex<MangaDbCache>>();
        let guard = db::lock(&cache)?;
        let mut manga_ids = Vec::new();
        let mut chapter_ids = Vec::new();
        for (id, manga) in &guard.db.mangas {
            if manga.source_id == source_id {
                manga_ids.push(id.clone());
                chapter_ids.extend(manga.chapters.keys().cloned());
            }
        }
        (manga_ids, chapter_ids)
    };

    let cache = app.state::<Mutex<MangaDbCache>>();
    db::mutate(&cache, &app, |db| {
        db.sources.remove(&source_id);
        db.mangas.retain(|_, m| m.source_id != source_id);
    })?;

    history::prune_mangas(&app, &manga_ids)?;

    if let Err(e) = cleanup_source_cache(&app, &manga_ids, &chapter_ids) {
        eprintln!("cleanup_source_cache failed: {}", e);
    }

    Ok(())
}

#[tauri::command]
pub fn rename_source(
    source_id: String,
    name: String,
    app: tauri::AppHandle,
) -> AppResult<()> {
    let cache = app.state::<Mutex<MangaDbCache>>();
    db::mutate(&cache, &app, |db| {
        if let Some(source) = db.sources.get_mut(&source_id) {
            source.name = name;
        }
    })
}

#[tauri::command]
pub fn reorder_sources(
    ordered_ids: Vec<String>,
    app: tauri::AppHandle,
) -> AppResult<()> {
    let cache = app.state::<Mutex<MangaDbCache>>();
    db::mutate(&cache, &app, |db| {
        for (i, id) in ordered_ids.iter().enumerate() {
            if let Some(source) = db.sources.get_mut(id) {
                source.sort_order = i as u32;
            }
        }
    })
}

#[tauri::command]
pub fn set_source_hidden(
    source_id: String,
    hidden: bool,
    app: tauri::AppHandle,
) -> AppResult<()> {
    let cache = app.state::<Mutex<MangaDbCache>>();
    db::mutate(&cache, &app, |db| {
        if let Some(source) = db.sources.get_mut(&source_id) {
            source.hidden = hidden;
        }
    })
}

fn cleanup_source_cache(
    app: &tauri::AppHandle,
    manga_ids: &[String],
    chapter_ids: &[String],
) -> AppResult<()> {
    let covers_dir = paths::covers_dir(app)?;
    let pages_dir = paths::pages_dir(app)?;

    if covers_dir.is_dir() {
        let id_set: HashSet<&str> = manga_ids.iter().map(|s| s.as_str()).collect();
        if let Ok(rd) = fs::read_dir(&covers_dir) {
            for entry in rd.filter_map(|e| e.ok()) {
                if let Some(stem) = entry.path().file_stem().and_then(|s| s.to_str()) {
                    if id_set.contains(stem) {
                        let _ = fs::remove_file(entry.path());
                    }
                }
            }
        }
    }

    for cid in chapter_ids {
        let dir = pages_dir.join(cid);
        if dir.is_dir() {
            let _ = fs::remove_dir_all(&dir);
        }
    }

    Ok(())
}

fn rename_cached_covers(
    app: &tauri::AppHandle,
    id_map: &HashMap<String, String>,
) -> AppResult<()> {
    if id_map.is_empty() {
        return Ok(());
    }

    let covers_dir = paths::covers_dir(app)?;
    if !covers_dir.is_dir() {
        return Ok(());
    }

    let mut renames: Vec<(PathBuf, PathBuf)> = Vec::new();
    for entry in fs::read_dir(&covers_dir)? {
        let path = entry?.path();
        let Some(stem) = path.file_stem().and_then(|s| s.to_str()) else {
            continue;
        };
        let Some(new_id) = id_map.get(stem) else {
            continue;
        };
        if stem == new_id {
            continue;
        }

        let new_name = match path.extension().and_then(|e| e.to_str()) {
            Some(ext) => format!("{}.{}", new_id, ext),
            None => new_id.to_string(),
        };
        renames.push((path, covers_dir.join(new_name)));
    }

    for (from, to) in renames {
        if to.exists() {
            let _ = fs::remove_file(&from);
            continue;
        }
        if let Err(e) = fs::rename(&from, &to) {
            eprintln!("Failed to rename cached cover {:?} -> {:?}: {}", from, to, e);
        }
    }

    Ok(())
}

