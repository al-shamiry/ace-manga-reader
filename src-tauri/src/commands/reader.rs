//! Tauri commands for chapter discovery, opening chapters, progress tracking,
//! and bulk read-state changes. All chapter domain logic lives in
//! `services::chapters`; per-manga reader settings live in `store::config`.

use crate::error::AppResult;
use crate::models::{Chapter, ReaderSettings};
use crate::services::chapters;
use crate::store::config;

// ── Per-manga reader settings ────────────────────────────────────────────────

#[tauri::command]
pub fn get_manga_reader_settings(
    app: tauri::AppHandle,
    manga_id: String,
) -> AppResult<ReaderSettings> {
    config::load_reader_settings(&app, &manga_id)
}

#[tauri::command]
pub fn set_manga_reader_settings(
    app: tauri::AppHandle,
    settings: ReaderSettings,
    manga_id: String,
) -> AppResult<()> {
    config::save_reader_settings(&app, &manga_id, settings)
}

// ── Chapter discovery & loading ──────────────────────────────────────────────

#[tauri::command]
pub fn get_chapters(manga_path: String, app: tauri::AppHandle) -> AppResult<Vec<Chapter>> {
    chapters::list(&app, &manga_path)
}

#[tauri::command]
pub fn rescan_manga(manga_path: String, app: tauri::AppHandle) -> AppResult<Vec<Chapter>> {
    chapters::rescan(&app, &manga_path)
}

#[tauri::command]
pub fn open_chapter(
    chapter_path: String,
    file_type: String,
    app: tauri::AppHandle,
) -> AppResult<Vec<String>> {
    chapters::open(&app, &chapter_path, &file_type)
}

// ── Progress & read state ────────────────────────────────────────────────────

#[tauri::command]
pub fn set_chapter_progress(
    manga_id: String,
    chapter_id: String,
    page: usize,
    total_pages: usize,
    app: tauri::AppHandle,
) -> AppResult<()> {
    chapters::set_progress(&app, manga_id, chapter_id, page, total_pages)
}

#[tauri::command]
pub fn mark_chapter_read(
    manga_id: String,
    chapter_id: String,
    read: bool,
    app: tauri::AppHandle,
) -> AppResult<()> {
    chapters::set_chapter_read(&app, manga_id, chapter_id, read)
}

#[tauri::command]
pub fn mark_mangas_read(
    manga_ids: Vec<String>,
    read: bool,
    app: tauri::AppHandle,
) -> AppResult<()> {
    chapters::set_mangas_read(&app, manga_ids, read)
}

#[tauri::command]
pub fn mark_chapters_read(
    manga_id: String,
    chapter_ids: Vec<String>,
    read: bool,
    app: tauri::AppHandle,
) -> AppResult<()> {
    chapters::set_chapters_read(&app, manga_id, chapter_ids, read)
}
