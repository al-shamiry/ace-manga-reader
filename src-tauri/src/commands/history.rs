//! Tauri commands for recently-read history (`history.json`). Persistence and
//! the source-maintenance helpers (prune, rekey) live in `store::history`.

use tauri::AppHandle;

use crate::error::AppResult;
use crate::infra::naming::now_epoch;
use crate::models::{HistoryData, HistoryEntry};
use crate::store::history;

const MAX_ENTRIES: usize = 1000;

#[tauri::command]
pub fn get_history(app: AppHandle) -> AppResult<Vec<HistoryEntry>> {
    Ok(history::load(&app)?.entries)
}

#[tauri::command]
pub fn record_history(entry: HistoryEntry, app: AppHandle) -> AppResult<()> {
    let mut data = history::load(&app)?;
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
    history::save(&app, &data)
}

#[tauri::command]
pub fn delete_history_entry(chapter_id: String, app: AppHandle) -> AppResult<()> {
    let mut data = history::load(&app)?;
    data.entries.retain(|e| e.chapter_id != chapter_id);
    history::save(&app, &data)
}

#[tauri::command]
pub fn clear_history(app: AppHandle) -> AppResult<()> {
    history::save(&app, &HistoryData::default())
}
