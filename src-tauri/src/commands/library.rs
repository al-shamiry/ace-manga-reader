//! Tauri commands for categories and library membership: category CRUD and
//! ordering, plus adding/removing mangas to the library and its categories.
//! Category state is persisted via `store::config`; manga membership via
//! `store::db`.

use std::collections::HashSet;

use crate::error::{AppError, AppResult};
use crate::infra::naming::now_epoch;
use crate::models::{Category, MangaDto, DEFAULT_CATEGORY_ID};
use crate::store::config::{load_config, save_config, update_config};
use crate::store::db::{self, DbExt};

// ── Category commands ────────────────────────────────────────────────────────

#[tauri::command]
pub fn list_categories(app: tauri::AppHandle) -> AppResult<Vec<Category>> {
    let mut cats = load_config(&app)?.categories;
    cats.sort_by_key(|c| c.sort_order);
    Ok(cats)
}

#[tauri::command]
pub fn create_category(app: tauri::AppHandle, name: String) -> AppResult<Category> {
    let mut config = load_config(&app)?;

    // Derive a unique id, disambiguating if two categories are created within
    // the same second (epoch granularity).
    let base = format!("cat_{}", now_epoch());
    let mut id = base.clone();
    let mut suffix = 1;
    while config.categories.iter().any(|c| c.id == id) {
        id = format!("{}_{}", base, suffix);
        suffix += 1;
    }

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

    // Move mangas off this category first, so a failure can't leave mangas
    // pointing at a category that no longer exists.
    let cache = app.db();
    db::mutate(&cache, &app, |db| {
        for manga in db.mangas.values_mut() {
            manga.category_ids.retain(|id| id != &category_id);
            manga.ensure_default_category();
        }
    })?;

    update_config(&app, |c| c.categories.retain(|cat| cat.id != category_id))
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
pub fn list_library(app: tauri::AppHandle) -> AppResult<Vec<MangaDto>> {
    let cache = app.db();
    let guard = db::lock(&cache)?;
    let hidden: HashSet<&str> = guard.db.sources.iter()
        .filter(|(_, source)| source.hidden)
        .map(|(id, _)| id.as_str())
        .collect();

    let mangas = guard.db.mangas.iter()
        .filter(|(_, manga)| manga.added_at.is_some() && !hidden.contains(manga.source_id.as_str()))
        .map(|(id, manga)| manga.project(id.clone()))
        .collect();
    Ok(mangas)
}

#[tauri::command]
pub fn add_to_library(
    app: tauri::AppHandle,
    manga_id: String,
    category_ids: Vec<String>,
) -> AppResult<()> {
    let cache = app.db();
    db::mutate(&cache, &app, |db| {
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
    let cache = app.db();
    db::mutate(&cache, &app, |db| {
        if let Some(m) = db.mangas.get_mut(&manga_id) {
            m.added_at = None;
            m.category_ids.clear();
        }
    })
}

/// Additively add a set of mangas to a set of categories in one DB write.
/// Existing memberships are preserved; mangas not yet in the library are added.
#[tauri::command]
pub fn add_mangas_to_categories(
    app: tauri::AppHandle,
    manga_ids: Vec<String>,
    category_ids: Vec<String>,
) -> AppResult<()> {
    let cache = app.db();
    let now = now_epoch();
    db::mutate(&cache, &app, |db| {
        for id in &manga_ids {
            if let Some(entry) = db.mangas.get_mut(id) {
                for cat in &category_ids {
                    if !entry.category_ids.contains(cat) {
                        entry.category_ids.push(cat.clone());
                    }
                }
                if entry.added_at.is_none() {
                    entry.added_at = Some(now);
                }
                entry.ensure_default_category();
            }
        }
    })
}

/// Remove a set of mangas from the library in one DB write.
#[tauri::command]
pub fn remove_mangas_from_library(
    app: tauri::AppHandle,
    manga_ids: Vec<String>,
) -> AppResult<()> {
    let cache = app.db();
    db::mutate(&cache, &app, |db| {
        for id in &manga_ids {
            if let Some(m) = db.mangas.get_mut(id) {
                m.added_at = None;
                m.category_ids.clear();
            }
        }
    })
}

/// Drop a single category membership from a set of mangas in one DB write.
/// A manga left with no categories falls out of the library entirely.
#[tauri::command]
pub fn remove_mangas_from_category(
    app: tauri::AppHandle,
    manga_ids: Vec<String>,
    category_id: String,
) -> AppResult<()> {
    let cache = app.db();
    db::mutate(&cache, &app, |db| {
        for id in &manga_ids {
            if let Some(m) = db.mangas.get_mut(id) {
                m.category_ids.retain(|c| c != &category_id);
                if m.category_ids.is_empty() {
                    m.added_at = None;
                }
            }
        }
    })
}
