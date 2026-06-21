//! Source relocation engine: validate that every manga folder exists at the new
//! path, then remap manga ids/paths/covers/chapter-statuses and move the source
//! record to its new id in one persisted transaction. Returns the old→new manga
//! id map so the caller can run history/cover maintenance.

use std::collections::{HashMap, HashSet};
use std::ffi::OsString;
use std::path::{Path, PathBuf};

use crate::error::{AppError, AppResult};
use crate::infra::image::subdirs_and_cbz;
use crate::infra::naming::{normalize, path_id};
use crate::models::{ChapterStatus, MangaDb, MangaRecord};
use crate::store::db::{self, DbExt};

/// Relocate `source_id` to `new_dir`, persisting the remap. Returns the old→new
/// manga id map (empty entries excluded only when ids are unchanged).
pub(crate) fn relocate_source(
    app: &tauri::AppHandle,
    source_id: &str,
    new_dir: &Path,
) -> AppResult<HashMap<String, String>> {
    let normalized_new_path = normalize(new_dir);
    let new_source_id = path_id(new_dir);
    let cache = app.db();

    let mut guard = db::lock(&cache)?;

    if !guard.db.sources.contains_key(source_id) {
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
    let old_source_path = guard.db.sources[source_id].path.clone();

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
        .remove(source_id)
        .ok_or_else(|| AppError::NotFound(format!("source '{}' not found", source_id)))?;
    for old_manga_id in &source_manga_ids {
        guard.db.mangas.remove(old_manga_id);
    }
    for (new_manga_id, record) in remapped_mangas {
        guard.db.mangas.insert(new_manga_id, record);
    }
    source_meta.path = normalized_new_path;
    source_meta.manga_count = source_manga_ids.len();
    guard.db.sources.insert(new_source_id, source_meta);

    db::save_db(app, &guard.db)?;
    Ok(id_map)
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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

/// Remap a manga's chapter-status map to the chapter ids at its new path,
/// matching chapters by folder/file name.
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

/// Rebase a path string from under `old_root` to under `new_root`.
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

/// Rename a cached cover path keyed by manga id (`{old_id}.ext` → `{new_id}.ext`).
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

/// The on-disk folder name for a manga, falling back to its title.
fn manga_folder_name(record: &MangaRecord) -> OsString {
    Path::new(&record.path)
        .file_name()
        .map(|name| name.to_os_string())
        .unwrap_or_else(|| OsString::from(&record.title))
}
