//! Tauri commands for global `Config` (`config.json`): reader defaults, root
//! directory, active category, and per-view sort/display/filter preferences.
//! Config types live in `models::settings`; persistence helpers here are
//! shared with `commands::library`.

use std::fs;

use crate::error::AppResult;
use crate::infra::atomic::write_atomic_json;
use crate::infra::paths;
use crate::models::{
    Config, LibraryDisplay, LibraryFilters, LibrarySortPreference, ReaderSettings, SourceDisplay,
    SourceFilters, SourceSortPreference,
};

// ── Config helpers ───────────────────────────────────────────────────────────

pub fn load_config(app: &tauri::AppHandle) -> AppResult<Config> {
    let path = paths::config_file(app)?;
    // A missing or unreadable file is treated as a default config.
    let config = fs::read_to_string(path)
        .ok()
        .and_then(|s| serde_json::from_str::<Config>(&s).ok())
        .unwrap_or_default()
        .normalize();
    Ok(config)
}

pub fn save_config(app: &tauri::AppHandle, config: &Config) -> AppResult<()> {
    write_atomic_json(&paths::config_file(app)?, config)
}

/// Load the config, apply `f`, and persist the result — the shared
/// read-modify-write used by every setter.
pub fn update_config<F>(app: &tauri::AppHandle, f: F) -> AppResult<()>
where
    F: FnOnce(&mut Config),
{
    let mut config = load_config(app)?;
    f(&mut config);
    save_config(app, &config)
}

// ── Root directory ───────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_root_directory(app: tauri::AppHandle) -> AppResult<Option<String>> {
    Ok(load_config(&app)?.root_directory)
}

#[tauri::command]
pub fn set_root_directory(app: tauri::AppHandle, path: String) -> AppResult<()> {
    update_config(&app, |c| c.root_directory = Some(path))
}

// ── Default reader settings ──────────────────────────────────────────────────

#[tauri::command]
pub fn get_default_reader_settings(app: tauri::AppHandle) -> AppResult<ReaderSettings> {
    Ok(load_config(&app)?.reader_settings)
}

#[tauri::command]
pub fn set_default_reader_settings(
    app: tauri::AppHandle,
    settings: ReaderSettings,
) -> AppResult<()> {
    update_config(&app, |c| c.reader_settings = settings.clamped())
}

// ── Active category tab ──────────────────────────────────────────────────────

#[tauri::command]
pub fn get_active_category(app: tauri::AppHandle) -> AppResult<Option<String>> {
    Ok(load_config(&app)?.active_category)
}

#[tauri::command]
pub fn set_active_category(app: tauri::AppHandle, category_id: String) -> AppResult<()> {
    update_config(&app, |c| c.active_category = Some(category_id))
}

// ── Library sort preference ──────────────────────────────────────────────────

#[tauri::command]
pub fn get_library_sort_preference(app: tauri::AppHandle) -> AppResult<LibrarySortPreference> {
    Ok(load_config(&app)?.library_sort_preference)
}

#[tauri::command]
pub fn set_library_sort_preference(
    app: tauri::AppHandle,
    preference: LibrarySortPreference,
) -> AppResult<()> {
    update_config(&app, |c| c.library_sort_preference = preference)
}

// ── Library display ──────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_library_display(app: tauri::AppHandle) -> AppResult<LibraryDisplay> {
    Ok(load_config(&app)?.library_display)
}

#[tauri::command]
pub fn set_library_display(app: tauri::AppHandle, display: LibraryDisplay) -> AppResult<()> {
    update_config(&app, |c| c.library_display = display.clamped())
}

// ── Library filters ──────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_library_filters(app: tauri::AppHandle) -> AppResult<LibraryFilters> {
    Ok(load_config(&app)?.library_filters)
}

#[tauri::command]
pub fn set_library_filters(app: tauri::AppHandle, filters: LibraryFilters) -> AppResult<()> {
    update_config(&app, |c| c.library_filters = filters)
}

// ── Source sort preference ───────────────────────────────────────────────────

#[tauri::command]
pub fn get_source_sort_preference(app: tauri::AppHandle) -> AppResult<SourceSortPreference> {
    Ok(load_config(&app)?.source_sort_preference)
}

#[tauri::command]
pub fn set_source_sort_preference(
    app: tauri::AppHandle,
    preference: SourceSortPreference,
) -> AppResult<()> {
    update_config(&app, |c| c.source_sort_preference = preference)
}

// ── Source display ───────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_source_display(app: tauri::AppHandle) -> AppResult<SourceDisplay> {
    Ok(load_config(&app)?.source_display)
}

#[tauri::command]
pub fn set_source_display(app: tauri::AppHandle, display: SourceDisplay) -> AppResult<()> {
    update_config(&app, |c| c.source_display = display.clamped())
}

// ── Source filters ───────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_source_filters(app: tauri::AppHandle) -> AppResult<SourceFilters> {
    Ok(load_config(&app)?.source_filters)
}

#[tauri::command]
pub fn set_source_filters(app: tauri::AppHandle, filters: SourceFilters) -> AppResult<()> {
    update_config(&app, |c| c.source_filters = filters)
}
