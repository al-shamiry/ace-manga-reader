//! Tauri commands for global `Config` (`config.json`): reader defaults, root
//! directory, active category, and per-view sort/display/filter preferences.
//! Config types live in `models::settings`; persistence in `store::config`.

use crate::error::AppResult;
use crate::models::{
    DisplayOverride, DisplayScope, LibraryDisplay, LibraryFilters, LibrarySortPreference,
    ReaderSettings, SourceFilters, SourceSortPreference, ViewDisplay,
};
use crate::store::config::{load_config, update_config};

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

// ── Display (global default + per-view overrides) ────────────────────────────

#[tauri::command]
pub fn get_default_display(app: tauri::AppHandle) -> AppResult<LibraryDisplay> {
    Ok(load_config(&app)?.default_display)
}

#[tauri::command]
pub fn set_default_display(app: tauri::AppHandle, display: LibraryDisplay) -> AppResult<()> {
    update_config(&app, |c| c.default_display = display.clamped())
}

#[tauri::command]
pub fn get_view_display(app: tauri::AppHandle, scope: DisplayScope) -> AppResult<ViewDisplay> {
    Ok(load_config(&app)?.resolved_display(scope))
}

#[tauri::command]
pub fn patch_view_display(
    app: tauri::AppHandle,
    scope: DisplayScope,
    patch: DisplayOverride,
) -> AppResult<ViewDisplay> {
    let mut resolved = None;
    update_config(&app, |c| {
        let over = c.display_override_mut(scope);
        *over = std::mem::take(over).merge(patch.clamped());
        resolved = Some(c.resolved_display(scope));
    })?;
    Ok(resolved.expect("update_config runs the closure"))
}

#[tauri::command]
pub fn reset_view_display(app: tauri::AppHandle, scope: DisplayScope) -> AppResult<ViewDisplay> {
    let mut resolved = None;
    update_config(&app, |c| {
        *c.display_override_mut(scope) = DisplayOverride::default();
        resolved = Some(c.resolved_display(scope));
    })?;
    Ok(resolved.expect("update_config runs the closure"))
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

// ── Source filters ───────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_source_filters(app: tauri::AppHandle) -> AppResult<SourceFilters> {
    Ok(load_config(&app)?.source_filters)
}

#[tauri::command]
pub fn set_source_filters(app: tauri::AppHandle, filters: SourceFilters) -> AppResult<()> {
    update_config(&app, |c| c.source_filters = filters)
}
