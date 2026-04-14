use std::collections::{HashMap, HashSet};
use std::ffi::OsString;
use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use rayon::prelude::*;
use tauri::Manager;
use zip::ZipArchive;

use crate::commands::{history, manga_db};
use crate::commands::manga_db::MangaDbCache;
use crate::models::manga::Manga;
use crate::models::manga_db::{MangaState, SourceMeta};
use crate::utils::{
    images_in, is_image, natural_cmp, normalize, now_epoch, path_id, subdirs_and_cbz,
    title_from_path,
};

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct Source {
    id: String,
    name: String,
    path: String,
    path_missing: bool,
    manga_count: usize,
    hidden: bool,
    scanned_at: u64,
    sort_order: u32,
}

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

/// Extract the cover image from a CBZ file into `cache_dir`, returning the cached path.
fn extract_cbz_cover(cbz_path: &Path, cover_id: &str, cache_dir: &Path) -> Result<String, String> {
    let file = fs::File::open(cbz_path).map_err(|e| e.to_string())?;
    let mut archive = ZipArchive::new(file).map_err(|e| e.to_string())?;

    let mut image_names: Vec<String> = (0..archive.len())
        .filter_map(|i| {
            archive.by_index(i).ok().and_then(|entry| {
                let name = entry.name().to_string();
                if is_image(Path::new(&name)) { Some(name) } else { None }
            })
        })
        .collect();
    image_names.sort();

    if image_names.is_empty() {
        return Err("No images in CBZ".to_string());
    }

    let cover_name = &image_names[0];
    let ext = Path::new(cover_name).extension().and_then(|e| e.to_str()).unwrap_or("jpg");
    let cover_path = cache_dir.join(format!("{}.{}", cover_id, ext));

    if !cover_path.exists() {
        let mut entry = archive.by_name(cover_name).map_err(|e| e.to_string())?;
        let mut bytes = Vec::new();
        entry.read_to_end(&mut bytes).map_err(|e| e.to_string())?;
        fs::write(&cover_path, &bytes).map_err(|e| e.to_string())?;
    }

    Ok(normalize(&cover_path))
}

/// Scan a manga folder that may contain CBZ files, image subdirs, or both.
/// Returns `None` if the folder has no chapters.
fn scan_manga(path: &Path, cache_dir: &Path) -> Option<Result<Manga, String>> {
    let (sub_dirs, cbz_files) = subdirs_and_cbz(path);
    let chapter_count = sub_dirs.len() + cbz_files.len();

    if chapter_count == 0 {
        return None;
    }

    let id = path_id(path);

    // Cover priority: explicit cover file > first image subdir > first CBZ
    let cover_result = find_folder_cover(path, &sub_dirs)
        .map(Ok)
        .or_else(|| cbz_files.first().map(|cbz| extract_cbz_cover(cbz, &id, cache_dir)));

    let cover_path = match cover_result {
        Some(Ok(p)) => p,
        Some(Err(e)) => return Some(Err(e)),
        None => return Some(Err("No cover found".to_string())),
    };

    Some(Ok(Manga {
        id,
        title: title_from_path(path),
        path: normalize(path),
        cover_path,
        chapter_count,
        read_chapters: 0,
        last_read_at: 0,
    }))
}

/// Collect all mangas found within `dir`, searching up to `depth` levels deep.
fn collect_mangas(dir: &Path, depth: u32, cache_dir: &Path) -> Vec<Manga> {
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

#[tauri::command]
pub fn list_sources(
    include_hidden: Option<bool>,
    app_handle: tauri::AppHandle,
) -> Result<Vec<Source>, String> {
    let include_hidden = include_hidden.unwrap_or(false);
    let cache = app_handle.state::<Mutex<MangaDbCache>>();
    let guard = cache.lock().map_err(|e| e.to_string())?;

    let mut sources: Vec<Source> = guard.db.sources.iter()
        .filter(|(_, meta)| include_hidden || !meta.hidden)
        .map(|(id, meta)| Source {
            id: id.clone(),
            name: meta.name.clone(),
            path: meta.source_path.clone(),
            path_missing: !Path::new(&meta.source_path).is_dir(),
            manga_count: meta.manga_count,
            hidden: meta.hidden,
            scanned_at: meta.scanned_at,
            sort_order: meta.sort_order,
        })
        .collect();

    sources.sort_by_key(|s| s.sort_order);
    Ok(sources)
}

#[tauri::command]
pub fn scan_directory(
    path: String,
    force_refresh: bool,
    app_handle: tauri::AppHandle,
) -> Result<Vec<Manga>, String> {
    let dir = Path::new(&path);
    if !dir.is_dir() {
        return Err(format!("'{}' is not a directory", path));
    }

    let source_id = path_id(dir);
    let cache = app_handle.state::<Mutex<MangaDbCache>>();

    // Cache hit: source is known and we have mangas for it → return directly
    if !force_refresh {
        let guard = cache.lock().map_err(|e| e.to_string())?;
        if guard.db.sources.contains_key(&source_id)
            && guard.db.mangas.values().any(|m| m.source_id == source_id)
        {
            let mut mangas: Vec<Manga> = guard
                .db
                .mangas
                .iter()
                .filter(|(_, m)| m.source_id == source_id)
                .map(|(id, m)| Manga {
                    id: id.clone(),
                    title: m.title.clone(),
                    path: m.path.clone(),
                    cover_path: m.cover_path.clone(),
                    chapter_count: m.chapter_count,
                    read_chapters: m.read_chapters,
                    last_read_at: m.last_read_at,
                })
                .collect();
            mangas.sort_by(|a, b| natural_cmp(&a.title, &b.title));
            return Ok(mangas);
        }
    }

    // Full disk scan
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e: tauri::Error| e.to_string())?;
    let covers_dir = app_data_dir.join("cache").join("covers");
    fs::create_dir_all(&covers_dir).map_err(|e| e.to_string())?;

    let mut mangas = collect_mangas(dir, 1, &covers_dir);
    mangas.sort_by(|a, b| natural_cmp(&a.title, &b.title));

    // Build the set of manga ids present on disk for this source
    let on_disk_ids: HashSet<String> = mangas.iter().map(|m| m.id.clone()).collect();
    let manga_count = on_disk_ids.len();

    let source_path_str = normalize(dir);
    let scanned_at = now_epoch();

    manga_db::mutate(&cache, &app_handle, |db| {
        // Update source metadata: preserve user-controlled fields for existing sources
        if let Some(existing) = db.sources.get_mut(&source_id) {
            existing.source_path = source_path_str;
            existing.scanned_at = scanned_at;
            existing.manga_count = manga_count;
        } else {
            let next_order = db.sources.values().map(|s| s.sort_order).max().unwrap_or(0) + 1;
            db.sources.insert(
                source_id.clone(),
                SourceMeta {
                    source_path: source_path_str,
                    scanned_at,
                    manga_count,
                    name: dir.file_name()
                        .and_then(|s| s.to_str())
                        .unwrap_or("")
                        .to_string(),
                    added_at: now_epoch(),
                    hidden: false,
                    sort_order: next_order,
                },
            );
        }

        // Drop mangas from this source that no longer exist on disk
        db.mangas.retain(|id, m| m.source_id != source_id || on_disk_ids.contains(id));

        // Merge scanned mangas into the db
        for manga in &mangas {
            let entry = db.mangas.entry(manga.id.clone()).or_insert_with(|| MangaState {
                source_id: source_id.clone(),
                title: manga.title.clone(),
                path: manga.path.clone(),
                cover_path: manga.cover_path.clone(),
                cover_override: None,
                chapter_count: manga.chapter_count,
                read_chapters: 0,
                last_read_at: 0,
                added_at: None,
                category_ids: Vec::new(),
                chapters: std::collections::HashMap::new(),
            });
            // Refresh mutable display fields; preserve reading state
            entry.source_id = source_id.clone();
            entry.title = manga.title.clone();
            entry.path = manga.path.clone();
            entry.cover_path = manga.cover_path.clone();
            entry.chapter_count = manga.chapter_count;
        }
    })?;

    // Enrich the returned mangas with read state from the db
    let guard = cache.lock().map_err(|e| e.to_string())?;
    let enriched: Vec<Manga> = mangas
        .into_iter()
        .map(|mut m| {
            if let Some(state) = guard.db.mangas.get(&m.id) {
                m.read_chapters = state.read_chapters;
                m.last_read_at = state.last_read_at;
            }
            m
        })
        .collect();

    Ok(enriched)
}

// ── Source CRUD helpers ───────────────────────────────────────────────────────

fn build_source_from_cache(
    db: &crate::models::manga_db::MangaDb,
    id: &str,
) -> Result<Source, String> {
    let meta = db.sources.get(id).ok_or_else(|| format!("source '{}' not found", id))?;
    Ok(Source {
        id: id.to_string(),
        name: meta.name.clone(),
        path: meta.source_path.clone(),
        path_missing: !Path::new(&meta.source_path).is_dir(),
        manga_count: meta.manga_count,
        hidden: meta.hidden,
        scanned_at: meta.scanned_at,
        sort_order: meta.sort_order,
    })
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
    old_chapters: &HashMap<String, crate::models::chapter::ChapterStatus>,
) -> HashMap<String, crate::models::chapter::ChapterStatus> {
    if old_chapters.is_empty() {
        return old_chapters.clone();
    }

    let (sub_dirs, cbz_files) = subdirs_and_cbz(new_manga_path);
    let mut remapped: HashMap<String, crate::models::chapter::ChapterStatus> = HashMap::new();

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

pub(crate) fn add_source_internal(
    app: &tauri::AppHandle,
    dir: &Path,
    name: Option<String>,
) -> Result<(), String> {
    if !dir.is_dir() {
        return Ok(());
    }
    let normalized = normalize(dir);
    let id = path_id(dir);
    let cache = app.state::<Mutex<MangaDbCache>>();
    {
        let guard = cache.lock().map_err(|e| e.to_string())?;
        if guard.db.sources.contains_key(&id) {
            return Ok(());
        }
    }
    let resolved_name = name
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| {
            dir.file_name().and_then(|s| s.to_str()).unwrap_or("Untitled").to_string()
        });
    let manga_count = count_mangas(dir);
    manga_db::mutate(&cache, app, |db| {
        let next_order = db.sources.values().map(|s| s.sort_order).max().unwrap_or(0) + 1;
        db.sources.insert(id.clone(), SourceMeta {
            source_path: normalized,
            scanned_at: 0,
            manga_count,
            name: resolved_name,
            added_at: now_epoch(),
            hidden: false,
            sort_order: next_order,
        });
    })
}

// ── Source CRUD commands ──────────────────────────────────────────────────────

#[tauri::command]
pub fn add_source(
    path: String,
    name: Option<String>,
    app_handle: tauri::AppHandle,
) -> Result<Source, String> {
    let dir = Path::new(&path);
    if !dir.is_dir() {
        return Err(format!("'{}' is not a directory", path));
    }

    let id = path_id(dir);
    let cache = app_handle.state::<Mutex<MangaDbCache>>();

    {
        let guard = cache.lock().map_err(|e| e.to_string())?;
        if guard.db.sources.contains_key(&id) {
            return build_source_from_cache(&guard.db, &id);
        }
    }

    let normalized = normalize(dir);
    let resolved_name = name
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| {
            dir.file_name().and_then(|s| s.to_str()).unwrap_or("Untitled").to_string()
        });
    let manga_count = count_mangas(dir);

    manga_db::mutate(&cache, &app_handle, |db| {
        let next_order = db.sources.values().map(|s| s.sort_order).max().unwrap_or(0) + 1;
        db.sources.insert(id.clone(), SourceMeta {
            source_path: normalized,
            scanned_at: 0,
            manga_count,
            name: resolved_name,
            added_at: now_epoch(),
            hidden: false,
            sort_order: next_order,
        });
    })?;

    let guard = cache.lock().map_err(|e| e.to_string())?;
    build_source_from_cache(&guard.db, &id)
}

#[tauri::command]
pub fn relocate_source(
    source_id: String,
    new_path: String,
    app_handle: tauri::AppHandle,
) -> Result<Source, String> {
    let new_dir = Path::new(&new_path);
    if !new_dir.is_dir() {
        return Err(format!("'{}' is not a directory", new_path));
    }

    let normalized_new_path = normalize(new_dir);
    let new_source_id = path_id(new_dir);
    let cache = app_handle.state::<Mutex<MangaDbCache>>();

    let id_map: HashMap<String, String> = {
        let mut guard = cache.lock().map_err(|e| e.to_string())?;

        if !guard.db.sources.contains_key(&source_id) {
            return Err(format!("source '{}' not found", source_id));
        }

        if new_source_id != source_id && guard.db.sources.contains_key(&new_source_id) {
            return Err("A source already exists for that folder".to_string());
        }

        let mut source_meta = guard
            .db
            .sources
            .remove(&source_id)
            .ok_or_else(|| format!("source '{}' not found", source_id))?;
        let old_source_path = source_meta.source_path.clone();

        let source_manga_ids: Vec<String> = guard
            .db
            .mangas
            .iter()
            .filter(|(_, m)| m.source_id == source_id)
            .map(|(id, _)| id.clone())
            .collect();
        let source_manga_set: HashSet<String> = source_manga_ids.iter().cloned().collect();

        // Validate all manga folders exist at the new path before committing
        let mut missing_mangas: Vec<String> = Vec::new();
        for old_manga_id in &source_manga_ids {
            let Some(existing) = guard.db.mangas.get(old_manga_id) else {
                continue;
            };
            let folder_name = Path::new(&existing.path)
                .file_name()
                .map(|name| name.to_os_string())
                .unwrap_or_else(|| OsString::from(&existing.title));
            if !new_dir.join(&folder_name).is_dir() {
                missing_mangas.push(existing.title.clone());
            }
        }
        if !missing_mangas.is_empty() {
            // Re-insert the source we removed before validation
            guard.db.sources.insert(source_id.clone(), source_meta);
            let count = missing_mangas.len();
            let preview: Vec<&str> = missing_mangas.iter().take(5).map(|s| s.as_str()).collect();
            let list = preview.join(", ");
            let suffix = if count > 5 { format!(" and {} more", count - 5) } else { String::new() };
            return Err(format!(
                "Cannot relocate: {} manga folder{} missing at the new path: {}{}",
                count,
                if count == 1 { "" } else { "s" },
                list,
                suffix,
            ));
        }

        let mut remapped_mangas: Vec<(String, MangaState)> = Vec::new();
        let mut id_map: HashMap<String, String> = HashMap::new();
        let mut used_new_manga_ids: HashSet<String> = HashSet::new();

        for old_manga_id in &source_manga_ids {
            let Some(existing) = guard.db.mangas.get(old_manga_id).cloned() else {
                continue;
            };

            let folder_name = Path::new(&existing.path)
                .file_name()
                .map(|name| name.to_os_string())
                .unwrap_or_else(|| OsString::from(&existing.title));
            let old_manga_path = PathBuf::from(&existing.path);
            let new_manga_path_buf = new_dir.join(folder_name);
            let new_manga_path = normalize(&new_manga_path_buf);
            let new_manga_id = path_id(&new_manga_path_buf);

            if !used_new_manga_ids.insert(new_manga_id.clone()) {
                return Err(format!(
                    "Multiple mangas would map to '{}'; rename folders before relocating.",
                    new_manga_path
                ));
            }

            if new_manga_id != *old_manga_id
                && guard.db.mangas.contains_key(&new_manga_id)
                && !source_manga_set.contains(&new_manga_id)
            {
                return Err(format!("Manga ID collision while relocating '{}'.", existing.title));
            }

            let mut updated = existing.clone();
            updated.source_id = new_source_id.clone();
            updated.path = new_manga_path;
            updated.cover_path = rebase_under_root(
                &updated.cover_path,
                &old_source_path,
                &normalized_new_path,
            );
            updated.cover_path = rekey_cached_cover_path(&updated.cover_path, old_manga_id, &new_manga_id);

            if let Some(override_path) = &existing.cover_override {
                let rebased = rebase_under_root(override_path, &old_source_path, &normalized_new_path);
                updated.cover_override = Some(rekey_cached_cover_path(&rebased, old_manga_id, &new_manga_id));
            }

            updated.chapters = remap_chapter_statuses(&old_manga_path, &new_manga_path_buf, &existing.chapters);
            updated.read_chapters = updated
                .chapters
                .values()
                .filter(|s| matches!(s, crate::models::chapter::ChapterStatus::Read))
                .count();

            id_map.insert(old_manga_id.clone(), new_manga_id.clone());
            remapped_mangas.push((new_manga_id, updated));
        }

        for old_manga_id in &source_manga_ids {
            guard.db.mangas.remove(old_manga_id);
        }
        for (new_manga_id, state) in remapped_mangas {
            guard.db.mangas.insert(new_manga_id, state);
        }

        source_meta.source_path = normalized_new_path.clone();
        source_meta.manga_count = source_manga_ids.len();
        guard.db.sources.insert(new_source_id.clone(), source_meta);

        manga_db::save_db(&app_handle, &guard.db)?;
        id_map
    };

    history::rekey_mangas(&app_handle, &id_map)?;
    if let Err(e) = rename_cached_covers(&app_handle, &id_map) {
        eprintln!("rename_cached_covers failed: {}", e);
    }

    let guard = cache.lock().map_err(|e| e.to_string())?;
    build_source_from_cache(&guard.db, &new_source_id)
}

#[tauri::command]
pub fn remove_source(
    source_id: String,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let (manga_ids, chapter_ids): (Vec<String>, Vec<String>) = {
        let cache = app_handle.state::<Mutex<MangaDbCache>>();
        let guard = cache.lock().map_err(|e| e.to_string())?;
        let mut mids = Vec::new();
        let mut cids = Vec::new();
        for (id, m) in &guard.db.mangas {
            if m.source_id == source_id {
                mids.push(id.clone());
                cids.extend(m.chapters.keys().cloned());
            }
        }
        (mids, cids)
    };

    let cache = app_handle.state::<Mutex<MangaDbCache>>();
    manga_db::mutate(&cache, &app_handle, |db| {
        db.sources.remove(&source_id);
        db.mangas.retain(|_, m| m.source_id != source_id);
    })?;

    crate::commands::history::prune_mangas(&app_handle, &manga_ids)?;

    if let Err(e) = cleanup_source_cache(&app_handle, &manga_ids, &chapter_ids) {
        eprintln!("cleanup_source_cache failed: {}", e);
    }

    Ok(())
}

#[tauri::command]
pub fn rename_source(
    source_id: String,
    name: String,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let cache = app_handle.state::<Mutex<MangaDbCache>>();
    manga_db::mutate(&cache, &app_handle, |db| {
        if let Some(meta) = db.sources.get_mut(&source_id) {
            meta.name = name;
        }
    })
}

#[tauri::command]
pub fn reorder_sources(
    ordered_ids: Vec<String>,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let cache = app_handle.state::<Mutex<MangaDbCache>>();
    manga_db::mutate(&cache, &app_handle, |db| {
        for (i, id) in ordered_ids.iter().enumerate() {
            if let Some(meta) = db.sources.get_mut(id) {
                meta.sort_order = i as u32;
            }
        }
    })
}

#[tauri::command]
pub fn set_source_hidden(
    source_id: String,
    hidden: bool,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let cache = app_handle.state::<Mutex<MangaDbCache>>();
    manga_db::mutate(&cache, &app_handle, |db| {
        if let Some(meta) = db.sources.get_mut(&source_id) {
            meta.hidden = hidden;
        }
    })
}

fn cleanup_source_cache(
    app: &tauri::AppHandle,
    manga_ids: &[String],
    chapter_ids: &[String],
) -> Result<(), String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let covers_dir = data_dir.join("cache").join("covers");
    let pages_dir = data_dir.join("cache").join("pages");

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
) -> Result<(), String> {
    if id_map.is_empty() {
        return Ok(());
    }

    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let covers_dir = data_dir.join("cache").join("covers");
    if !covers_dir.is_dir() {
        return Ok(());
    }

    let mut renames: Vec<(PathBuf, PathBuf)> = Vec::new();
    for entry in fs::read_dir(&covers_dir).map_err(|e| e.to_string())? {
        let path = entry.map_err(|e| e.to_string())?.path();
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

