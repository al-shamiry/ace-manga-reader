//! Centralized construction of every on-disk path the app uses, so the
//! `app_data_dir` lookup (which can fail) lives in exactly one place.

use std::path::PathBuf;

use tauri::{AppHandle, Manager};

use crate::error::AppResult;

/// Root of the app's persistent storage
/// (`%APPDATA%/ace-manga-reader` on Windows).
pub(crate) fn data_dir(app: &AppHandle) -> AppResult<PathBuf> {
    Ok(app.path().app_data_dir()?)
}

pub(crate) fn config_file(app: &AppHandle) -> AppResult<PathBuf> {
    Ok(data_dir(app)?.join("config.json"))
}

pub(crate) fn db_file(app: &AppHandle) -> AppResult<PathBuf> {
    Ok(data_dir(app)?.join("manga_db.json"))
}

pub(crate) fn history_file(app: &AppHandle) -> AppResult<PathBuf> {
    Ok(data_dir(app)?.join("history.json"))
}

pub(crate) fn manga_settings_file(app: &AppHandle, manga_id: &str) -> AppResult<PathBuf> {
    Ok(data_dir(app)?
        .join("settings")
        .join(format!("{manga_id}.json")))
}

pub(crate) fn covers_dir(app: &AppHandle) -> AppResult<PathBuf> {
    Ok(data_dir(app)?.join("cache").join("covers"))
}

pub(crate) fn pages_dir(app: &AppHandle) -> AppResult<PathBuf> {
    Ok(data_dir(app)?.join("cache").join("pages"))
}
