use std::collections::HashSet;
use std::sync::Mutex;

use tauri::Manager;

use crate::commands::manga_db::{self, MangaDbCache};
use crate::commands::settings::{load_config, save_config, update_config};
use crate::error::{AppError, AppResult};
use crate::models::{Category, MangaDto, DEFAULT_CATEGORY_ID};
use crate::utils::now_epoch;

// ── Category commands ────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_categories(app: tauri::AppHandle) -> AppResult<Vec<Category>> {
    let mut cats = load_config(&app)?.categories;
    cats.sort_by_key(|c| c.sort_order);
    Ok(cats)
}

#[tauri::command]
pub fn create_category(app: tauri::AppHandle, name: String) -> AppResult<Category> {
    let mut config = load_config(&app)?;
    let id = format!("cat_{}", now_epoch());
    let sort_order = config.categories.iter().map(|c| c.sort_order).max().unwrap_or(0) + 1;
    let cat = Category { id, name, sort_order };
    config.categories.push(cat.clone());
    save_config(&app, &config)?;
    Ok(cat)
}

#[tauri::command]
pub fn rename_category(app: tauri::AppHandle, category_id: String, name: String) -> AppResult<()> {
    let mut config = load_config(&app)?;
    let cat = config.categories.iter_mut().find(|c| c.id == category_id)
        .ok_or_else(|| AppError::NotFound(format!("Category '{}' not found", category_id)))?;
    cat.name = name;
    save_config(&app, &config)
}

#[tauri::command]
pub fn delete_category(app: tauri::AppHandle, category_id: String) -> AppResult<()> {
    if category_id == DEFAULT_CATEGORY_ID {
        return Err(AppError::Invalid(
            "Cannot delete the default category".to_string(),
        ));
    }

    update_config(&app, |c| c.categories.retain(|cat| cat.id != category_id))?;

    // Move orphaned mangas to default
    let cache = app.state::<Mutex<MangaDbCache>>();
    manga_db::mutate(&cache, &app, |db| {
        for m in db.mangas.values_mut() {
            m.category_ids.retain(|id| id != &category_id);
            m.ensure_default_category();
        }
    })
}

#[tauri::command]
pub fn reorder_categories(app: tauri::AppHandle, category_ids: Vec<String>) -> AppResult<()> {
    update_config(&app, |config| {
        for (i, id) in category_ids.iter().enumerate() {
            if let Some(cat) = config.categories.iter_mut().find(|c| &c.id == id) {
                cat.sort_order = i as u32;
            }
        }
        config.categories.sort_by_key(|c| c.sort_order);
    })
}

// ── Library commands ─────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_library(app: tauri::AppHandle) -> AppResult<Vec<MangaDto>> {
    let cache = app.state::<Mutex<MangaDbCache>>();
    let guard = manga_db::lock(&cache)?;
    let hidden: HashSet<&str> = guard.db.sources.iter()
        .filter(|(_, s)| s.hidden)
        .map(|(id, _)| id.as_str())
        .collect();

    let mangas = guard.db.mangas.iter()
        .filter(|(_, m)| m.added_at.is_some() && !hidden.contains(m.source_id.as_str()))
        .map(|(id, m)| m.project(id.clone()))
        .collect();
    Ok(mangas)
}

#[tauri::command]
pub fn add_to_library(
    app: tauri::AppHandle,
    manga_id: String,
    category_ids: Vec<String>,
) -> AppResult<()> {
    let cache = app.state::<Mutex<MangaDbCache>>();
    manga_db::mutate(&cache, &app, |db| {
        if let Some(entry) = db.mangas.get_mut(&manga_id) {
            entry.category_ids = category_ids;
            if entry.added_at.is_none() {
                entry.added_at = Some(now_epoch());
            }
            entry.ensure_default_category();
        }
    })
}

#[tauri::command]
pub fn remove_from_library(app: tauri::AppHandle, manga_id: String) -> AppResult<()> {
    let cache = app.state::<Mutex<MangaDbCache>>();
    manga_db::mutate(&cache, &app, |db| {
        if let Some(m) = db.mangas.get_mut(&manga_id) {
            m.added_at = None;
            m.category_ids.clear();
        }
    })
}

#[tauri::command]
pub fn is_in_library(app: tauri::AppHandle, manga_id: String) -> AppResult<bool> {
    let cache = app.state::<Mutex<MangaDbCache>>();
    Ok(manga_db::get_manga(&cache, &manga_id)?
        .map(|m| m.added_at.is_some())
        .unwrap_or(false))
}
