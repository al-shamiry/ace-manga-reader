use std::collections::HashMap;
use std::fs;
use std::time::{SystemTime, UNIX_EPOCH};

use tauri::Manager;

use crate::models::category::{Category, LibraryEntry, DEFAULT_CATEGORY_ID};

// ── File paths ───────────────────────────────────────────────────────────────

fn categories_path(app: &tauri::AppHandle) -> std::path::PathBuf {
    app.path().app_data_dir().unwrap().join("categories.json")
}

fn library_path(app: &tauri::AppHandle) -> std::path::PathBuf {
    app.path().app_data_dir().unwrap().join("library.json")
}

// ── Persistence helpers ──────────────────────────────────────────────────────

fn load_categories(app: &tauri::AppHandle) -> Vec<Category> {
    let path = categories_path(app);
    let cats: Vec<Category> = fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();

    // Ensure default category always exists
    if cats.iter().any(|c| c.id == DEFAULT_CATEGORY_ID) {
        cats
    } else {
        let mut with_default = vec![Category::default_category()];
        with_default.extend(cats);
        with_default
    }
}

fn save_categories(app: &tauri::AppHandle, cats: &[Category]) -> Result<(), String> {
    let path = categories_path(app);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(cats).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())
}

fn load_library(app: &tauri::AppHandle) -> HashMap<String, LibraryEntry> {
    let path = library_path(app);
    fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_library(app: &tauri::AppHandle, lib: &HashMap<String, LibraryEntry>) -> Result<(), String> {
    let path = library_path(app);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(lib).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())
}

fn now_epoch() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

// ── Category commands ────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_categories(app: tauri::AppHandle) -> Vec<Category> {
    let mut cats = load_categories(&app);
    cats.sort_by_key(|c| c.sort_order);
    cats
}

#[tauri::command]
pub fn create_category(app: tauri::AppHandle, name: String) -> Result<Category, String> {
    let mut cats = load_categories(&app);
    let id = format!("cat_{}", now_epoch());
    let sort_order = cats.iter().map(|c| c.sort_order).max().unwrap_or(0) + 1;
    let cat = Category { id, name, sort_order };
    cats.push(cat.clone());
    save_categories(&app, &cats)?;
    Ok(cat)
}

#[tauri::command]
pub fn rename_category(app: tauri::AppHandle, category_id: String, name: String) -> Result<(), String> {
    let mut cats = load_categories(&app);
    let cat = cats.iter_mut().find(|c| c.id == category_id)
        .ok_or_else(|| format!("Category '{}' not found", category_id))?;
    cat.name = name;
    save_categories(&app, &cats)
}

#[tauri::command]
pub fn delete_category(app: tauri::AppHandle, category_id: String) -> Result<(), String> {
    if category_id == DEFAULT_CATEGORY_ID {
        return Err("Cannot delete the default category".to_string());
    }

    let mut cats = load_categories(&app);
    cats.retain(|c| c.id != category_id);
    save_categories(&app, &cats)?;

    // Move orphaned mangas to default
    let mut lib = load_library(&app);
    for entry in lib.values_mut() {
        entry.category_ids.retain(|id| id != &category_id);
        if entry.category_ids.is_empty() {
            entry.category_ids.push(DEFAULT_CATEGORY_ID.to_string());
        }
    }
    save_library(&app, &lib)
}

#[tauri::command]
pub fn reorder_categories(app: tauri::AppHandle, category_ids: Vec<String>) -> Result<(), String> {
    let mut cats = load_categories(&app);
    for (i, id) in category_ids.iter().enumerate() {
        if let Some(cat) = cats.iter_mut().find(|c| &c.id == id) {
            cat.sort_order = i as u32;
        }
    }
    cats.sort_by_key(|c| c.sort_order);
    save_categories(&app, &cats)
}

// ── Library commands ─────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_library(app: tauri::AppHandle) -> Vec<LibraryEntry> {
    load_library(&app).into_values().collect()
}

#[tauri::command]
pub fn add_to_library(
    app: tauri::AppHandle,
    manga_id: String,
    title: String,
    path: String,
    cover_path: String,
    chapter_count: usize,
    category_ids: Vec<String>,
) -> Result<(), String> {
    let mut lib = load_library(&app);
    let ids = if category_ids.is_empty() {
        vec![DEFAULT_CATEGORY_ID.to_string()]
    } else {
        category_ids
    };

    match lib.get_mut(&manga_id) {
        Some(entry) => {
            // Update existing entry
            entry.title = title;
            entry.path = path;
            entry.cover_path = cover_path;
            entry.chapter_count = chapter_count;
            entry.category_ids = ids;
        }
        None => {
            lib.insert(manga_id.clone(), LibraryEntry {
                manga_id,
                title,
                path,
                cover_path,
                chapter_count,
                category_ids: ids,
                added_at: now_epoch(),
            });
        }
    }
    save_library(&app, &lib)
}

#[tauri::command]
pub fn remove_from_library(app: tauri::AppHandle, manga_id: String) -> Result<(), String> {
    let mut lib = load_library(&app);
    lib.remove(&manga_id);
    save_library(&app, &lib)
}

#[tauri::command]
pub fn is_in_library(app: tauri::AppHandle, manga_id: String) -> bool {
    load_library(&app).contains_key(&manga_id)
}
