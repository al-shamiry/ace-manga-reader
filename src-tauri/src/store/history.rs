//! Persistence for recently-read history (`history.json`), plus the
//! source-maintenance helpers used when a source is removed or relocated.

use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::Path;

use tauri::AppHandle;

use crate::error::AppResult;
use crate::infra::atomic::write_atomic_json;
use crate::infra::naming::{normalize, path_id};
use crate::infra::paths;
use crate::models::HistoryData;
use crate::store::db::{self, DbExt};

pub(crate) fn load(app: &AppHandle) -> AppResult<HistoryData> {
    let path = paths::history_file(app)?;
    // A missing or unreadable file is treated as empty history.
    Ok(fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default())
}

pub(crate) fn save(app: &AppHandle, data: &HistoryData) -> AppResult<()> {
    write_atomic_json(&paths::history_file(app)?, data)
}

/// Remove history entries for the given manga ids. Called from `remove_source`.
pub(crate) fn prune_mangas(app: &AppHandle, manga_ids: &[String]) -> AppResult<()> {
    if manga_ids.is_empty() {
        return Ok(());
    }
    let mut data = load(app)?;
    let id_set: HashSet<&str> = manga_ids.iter().map(|s| s.as_str()).collect();
    data.entries.retain(|e| !id_set.contains(e.manga_id.as_str()));
    save(app, &data)
}

/// Re-key history entries after a source relocation changed manga ids, pulling
/// fresh title/path/cover values from the (already relocated) DB.
pub(crate) fn rekey_mangas(app: &AppHandle, id_map: &HashMap<String, String>) -> AppResult<()> {
    if id_map.is_empty() {
        return Ok(());
    }

    let mut data = load(app)?;
    if data.entries.is_empty() {
        return Ok(());
    }

    let cache = app.db();
    let guard = db::lock(&cache)?;

    for entry in data.entries.iter_mut() {
        let Some(new_manga_id) = id_map.get(&entry.manga_id) else {
            continue;
        };

        entry.manga_id = new_manga_id.clone();

        if let Some(manga) = guard.db.mangas.get(new_manga_id) {
            entry.manga_title = manga.title.clone();
            entry.manga_path = manga.path.clone();
            entry.manga_cover_path = manga.cover_path.clone();
            entry.manga_chapter_count = manga.chapter_count;

            if let Some(chapter_name) = Path::new(&entry.chapter_path).file_name() {
                let new_chapter_path = normalize(&Path::new(&manga.path).join(chapter_name));
                entry.chapter_path = new_chapter_path.clone();
                entry.chapter_id = path_id(Path::new(&new_chapter_path));
            }
        }
    }

    drop(guard);
    save(app, &data)
}
