use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::Path;
use std::sync::Mutex;

use tauri::{AppHandle, Manager};

use crate::commands::manga_db::{self, MangaDbCache};
use crate::error::AppResult;
use crate::models::{HistoryData, HistoryEntry};
use crate::paths;
use crate::utils::{normalize, now_epoch, path_id, write_atomic_json};

const MAX_ENTRIES: usize = 1000;

fn load_history(app: &AppHandle) -> AppResult<HistoryData> {
    let path = paths::history_file(app)?;
    // A missing or unreadable file is treated as empty history.
    Ok(fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default())
}

fn save_history(app: &AppHandle, data: &HistoryData) -> AppResult<()> {
    write_atomic_json(&paths::history_file(app)?, data)
}

#[tauri::command]
pub fn get_history(app: AppHandle) -> AppResult<Vec<HistoryEntry>> {
    Ok(load_history(&app)?.entries)
}

#[tauri::command]
pub fn record_history(entry: HistoryEntry, app: AppHandle) -> AppResult<()> {
    let mut data = load_history(&app)?;
    // One entry per manga: remove any existing entry for this manga (regardless of chapter)
    // so the fresh one replaces it at the top. "Last chapter I read" is what matters, not
    // the actual chapter order.
    data.entries.retain(|e| e.manga_id != entry.manga_id);
    let mut updated = entry;
    updated.last_read_at = now_epoch();
    data.entries.insert(0, updated);
    if data.entries.len() > MAX_ENTRIES {
        data.entries.truncate(MAX_ENTRIES);
    }
    save_history(&app, &data)
}

#[tauri::command]
pub fn delete_history_entry(chapter_id: String, app: AppHandle) -> AppResult<()> {
    let mut data = load_history(&app)?;
    data.entries.retain(|e| e.chapter_id != chapter_id);
    save_history(&app, &data)
}

#[tauri::command]
pub fn clear_history(app: AppHandle) -> AppResult<()> {
    save_history(&app, &HistoryData::default())
}

/// Remove history entries for the given manga IDs. Called from `remove_source`.
pub fn prune_mangas(app: &AppHandle, manga_ids: &[String]) -> AppResult<()> {
    if manga_ids.is_empty() {
        return Ok(());
    }
    let mut data = load_history(app)?;
    let id_set: HashSet<&str> = manga_ids.iter().map(|s| s.as_str()).collect();
    data.entries.retain(|e| !id_set.contains(e.manga_id.as_str()));
    save_history(app, &data)
}

/// Re-key history entries after source relocation changed manga IDs.
pub fn rekey_mangas(app: &AppHandle, id_map: &HashMap<String, String>) -> AppResult<()> {
    if id_map.is_empty() {
        return Ok(());
    }

    let mut data = load_history(app)?;
    if data.entries.is_empty() {
        return Ok(());
    }

    let cache = app.state::<Mutex<MangaDbCache>>();
    let guard = manga_db::lock(&cache)?;

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
    save_history(app, &data)
}
