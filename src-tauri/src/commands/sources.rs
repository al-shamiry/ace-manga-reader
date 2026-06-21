//! Tauri commands for source folders: listing, scanning, add/relocate/remove,
//! rename, reorder, and visibility. Disk scanning lives in `services::scan`,
//! relocation in `services::relocate`, and cache cleanup in `services::cache`.

use std::path::Path;

use crate::error::{AppError, AppResult};
use crate::infra::naming::path_id;
use crate::models::{MangaDto, SourceDto};
use crate::services::{cache, relocate, scan};
use crate::store::db::{self, DbExt};
use crate::store::history;

#[tauri::command]
pub fn list_sources(
    include_hidden: Option<bool>,
    app: tauri::AppHandle,
) -> AppResult<Vec<SourceDto>> {
    let include_hidden = include_hidden.unwrap_or(false);
    let cache = app.db();
    let guard = db::lock(&cache)?;

    let mut sources: Vec<SourceDto> = guard
        .db
        .sources
        .iter()
        .filter(|(_, source)| include_hidden || !source.hidden)
        .map(|(id, source)| source.project(id.as_str()))
        .collect();

    sources.sort_by_key(|s| s.sort_order);
    Ok(sources)
}

#[tauri::command]
pub fn scan_source(
    path: String,
    force_refresh: bool,
    app: tauri::AppHandle,
) -> AppResult<Vec<MangaDto>> {
    let dir = Path::new(&path);
    if !dir.is_dir() {
        return Err(AppError::Invalid(format!("'{}' is not a directory", path)));
    }

    let source_id = path_id(dir);
    scan::scan_source(&app, dir, &source_id, force_refresh)
}

#[tauri::command]
pub fn add_source(
    path: String,
    name: Option<String>,
    app: tauri::AppHandle,
) -> AppResult<SourceDto> {
    let dir = Path::new(&path);
    if !dir.is_dir() {
        return Err(AppError::Invalid(format!("'{}' is not a directory", path)));
    }

    let id = scan::ensure_source(&app, dir, name)?;
    let cache = app.db();
    let guard = db::lock(&cache)?;
    scan::project_source(&guard.db, &id)
}

#[tauri::command]
pub fn relocate_source(
    source_id: String,
    new_path: String,
    app: tauri::AppHandle,
) -> AppResult<SourceDto> {
    let new_dir = Path::new(&new_path);
    if !new_dir.is_dir() {
        return Err(AppError::Invalid(format!("'{}' is not a directory", new_path)));
    }

    let id_map = relocate::relocate_source(&app, &source_id, new_dir)?;

    // Cross-feature maintenance is orchestrated here, not inside the service.
    history::rekey_mangas(&app, &id_map)?;
    if let Err(e) = cache::rename_cached_covers(&app, &id_map) {
        eprintln!("rename_cached_covers failed: {}", e);
    }

    let new_source_id = path_id(new_dir);
    let cache = app.db();
    let guard = db::lock(&cache)?;
    scan::project_source(&guard.db, &new_source_id)
}

#[tauri::command]
pub fn remove_source(source_id: String, app: tauri::AppHandle) -> AppResult<()> {
    let (manga_ids, chapter_ids): (Vec<String>, Vec<String>) = {
        let cache = app.db();
        let guard = db::lock(&cache)?;
        let mut manga_ids = Vec::new();
        let mut chapter_ids = Vec::new();
        for (id, manga) in &guard.db.mangas {
            if manga.source_id == source_id {
                manga_ids.push(id.clone());
                chapter_ids.extend(manga.chapters.keys().cloned());
            }
        }
        (manga_ids, chapter_ids)
    };

    let cache = app.db();
    db::mutate(&cache, &app, |db| {
        db.sources.remove(&source_id);
        db.mangas.retain(|_, m| m.source_id != source_id);
    })?;

    history::prune_mangas(&app, &manga_ids)?;

    if let Err(e) = cache::cleanup_source_cache(&app, &manga_ids, &chapter_ids) {
        eprintln!("cleanup_source_cache failed: {}", e);
    }

    Ok(())
}

#[tauri::command]
pub fn rename_source(source_id: String, name: String, app: tauri::AppHandle) -> AppResult<()> {
    let cache = app.db();
    db::mutate(&cache, &app, |db| {
        if let Some(source) = db.sources.get_mut(&source_id) {
            source.name = name;
        }
    })
}

#[tauri::command]
pub fn reorder_sources(ordered_ids: Vec<String>, app: tauri::AppHandle) -> AppResult<()> {
    let cache = app.db();
    db::mutate(&cache, &app, |db| {
        for (i, id) in ordered_ids.iter().enumerate() {
            if let Some(source) = db.sources.get_mut(id) {
                source.sort_order = i as u32;
            }
        }
    })
}

#[tauri::command]
pub fn set_source_hidden(source_id: String, hidden: bool, app: tauri::AppHandle) -> AppResult<()> {
    let cache = app.db();
    db::mutate(&cache, &app, |db| {
        if let Some(source) = db.sources.get_mut(&source_id) {
            source.hidden = hidden;
        }
    })
}
