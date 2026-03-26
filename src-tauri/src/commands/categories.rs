use std::fs;
use std::time::{SystemTime, UNIX_EPOCH};

use tauri::Manager;

use crate::models::category::{Category, LibraryData, LibraryEntry, DEFAULT_CATEGORY_ID};
use crate::models::chapter::ChapterStatus;

// ── File path ────────────────────────────────────────────────────────────────

fn library_path(app: &tauri::AppHandle) -> std::path::PathBuf {
    app.path().app_data_dir().unwrap().join("library.json")
}

// ── Persistence helpers ──────────────────────────────────────────────────────

pub(crate) fn load_library_data(app: &tauri::AppHandle) -> LibraryData {
    let path = library_path(app);
    let mut data: LibraryData = fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();

    // Ensure default category always exists
    if !data.categories.iter().any(|c| c.id == DEFAULT_CATEGORY_ID) {
        data.categories.insert(0, Category::default_category());
    }

    data
}

pub(crate) fn save_library_data(app: &tauri::AppHandle, data: &LibraryData) -> Result<(), String> {
    let path = library_path(app);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(data).map_err(|e| e.to_string())?;
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
    let mut data = load_library_data(&app);
    data.categories.sort_by_key(|c| c.sort_order);
    data.categories
}

#[tauri::command]
pub fn create_category(app: tauri::AppHandle, name: String) -> Result<Category, String> {
    let mut data = load_library_data(&app);
    let id = format!("cat_{}", now_epoch());
    let sort_order = data.categories.iter().map(|c| c.sort_order).max().unwrap_or(0) + 1;
    let cat = Category { id, name, sort_order };
    data.categories.push(cat.clone());
    save_library_data(&app, &data)?;
    Ok(cat)
}

#[tauri::command]
pub fn rename_category(app: tauri::AppHandle, category_id: String, name: String) -> Result<(), String> {
    let mut data = load_library_data(&app);
    let cat = data.categories.iter_mut().find(|c| c.id == category_id)
        .ok_or_else(|| format!("Category '{}' not found", category_id))?;
    cat.name = name;
    save_library_data(&app, &data)
}

#[tauri::command]
pub fn delete_category(app: tauri::AppHandle, category_id: String) -> Result<(), String> {
    if category_id == DEFAULT_CATEGORY_ID {
        return Err("Cannot delete the default category".to_string());
    }

    let mut data = load_library_data(&app);
    data.categories.retain(|c| c.id != category_id);

    // Move orphaned mangas to default
    for entry in data.entries.values_mut() {
        entry.category_ids.retain(|id| id != &category_id);
        if entry.category_ids.is_empty() {
            entry.category_ids.push(DEFAULT_CATEGORY_ID.to_string());
        }
    }
    save_library_data(&app, &data)
}

#[tauri::command]
pub fn reorder_categories(app: tauri::AppHandle, category_ids: Vec<String>) -> Result<(), String> {
    let mut data = load_library_data(&app);
    for (i, id) in category_ids.iter().enumerate() {
        if let Some(cat) = data.categories.iter_mut().find(|c| &c.id == id) {
            cat.sort_order = i as u32;
        }
    }
    data.categories.sort_by_key(|c| c.sort_order);
    save_library_data(&app, &data)
}

fn count_read_chapters(app: &tauri::AppHandle, manga_id: &str) -> usize {
    let app_data_dir = match app.path().app_data_dir() {
        Ok(d) => d,
        Err(_) => return 0,
    };
    let progress_path = app_data_dir.join("progress").join(format!("{}.json", manga_id));
    let map: std::collections::HashMap<String, ChapterStatus> = fs::read_to_string(&progress_path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    map.values().filter(|s| matches!(s, ChapterStatus::Read)).count()
}

// ── Library commands ─────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_library(app: tauri::AppHandle) -> Vec<LibraryEntry> {
    load_library_data(&app).entries.into_values().collect()
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
    let mut data = load_library_data(&app);
    let ids = if category_ids.is_empty() {
        vec![DEFAULT_CATEGORY_ID.to_string()]
    } else {
        category_ids
    };

    let read_chapters = count_read_chapters(&app, &manga_id);

    match data.entries.get_mut(&manga_id) {
        Some(entry) => {
            entry.title = title;
            entry.path = path;
            entry.cover_path = cover_path;
            entry.chapter_count = chapter_count;
            entry.read_chapters = read_chapters;
            entry.category_ids = ids;
        }
        None => {
            data.entries.insert(manga_id.clone(), LibraryEntry {
                manga_id,
                title,
                path,
                cover_path,
                chapter_count,
                read_chapters,
                category_ids: ids,
                added_at: now_epoch(),
            });
        }
    }
    save_library_data(&app, &data)
}

#[tauri::command]
pub fn remove_from_library(app: tauri::AppHandle, manga_id: String) -> Result<(), String> {
    let mut data = load_library_data(&app);
    data.entries.remove(&manga_id);
    save_library_data(&app, &data)
}

#[tauri::command]
pub fn is_in_library(app: tauri::AppHandle, manga_id: String) -> bool {
    load_library_data(&app).entries.contains_key(&manga_id)
}
