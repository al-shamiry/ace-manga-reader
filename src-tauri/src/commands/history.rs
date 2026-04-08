use std::fs;
use std::path::PathBuf;

use tauri::{AppHandle, Manager};

use crate::utils::now_epoch;
use crate::models::history::{HistoryData, HistoryEntry};

const MAX_ENTRIES: usize = 1000;

fn history_path(app: &AppHandle) -> PathBuf {
    app.path().app_data_dir().unwrap().join("history.json")
}

fn load(app: &AppHandle) -> HistoryData {
    let path = history_path(app);
    fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save(app: &AppHandle, data: &HistoryData) -> Result<(), String> {
    crate::utils::write_atomic_json(&history_path(app), data)
}

#[tauri::command]
pub fn get_history(app: AppHandle) -> Vec<HistoryEntry> {
    load(&app).entries
}

#[tauri::command]
pub fn record_history(entry: HistoryEntry, app: AppHandle) -> Result<(), String> {
    let mut data = load(&app);
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
    save(&app, &data)
}

#[tauri::command]
pub fn delete_history_entry(chapter_id: String, app: AppHandle) -> Result<(), String> {
    let mut data = load(&app);
    data.entries.retain(|e| e.chapter_id != chapter_id);
    save(&app, &data)
}

#[tauri::command]
pub fn clear_history(app: AppHandle) -> Result<(), String> {
    save(&app, &HistoryData::default())
}
