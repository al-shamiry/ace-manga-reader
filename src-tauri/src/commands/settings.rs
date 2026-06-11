use serde::{Deserialize, Serialize};
use std::fs;
use tauri::Manager;

use crate::models::category::{Category, DEFAULT_CATEGORY_ID};

// ── Types ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct ReaderSettings {
    pub fit_mode: Option<String>,
    pub reading_mode: Option<String>,
    pub webtoon_padding: Option<u8>,
}

impl Default for ReaderSettings {
    fn default() -> Self {
        Self {
            fit_mode: Some("fit-screen".to_string()),
            reading_mode: Some("paged-rtl".to_string()),
            webtoon_padding: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct SortPreference {
    pub field: String,
    pub direction: String,
}

impl Default for SortPreference {
    fn default() -> Self {
        Self {
            field: "last_read".to_string(),
            direction: "desc".to_string(),
        }
    }
}

fn default_source_sort_preference() -> SortPreference {
    SortPreference {
        field: "alphabetical".to_string(),
        direction: "desc".to_string(),
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LibraryDisplay {
    #[serde(default = "default_display_mode")]
    pub display_mode: String,
    #[serde(default = "default_card_size")]
    pub card_size: u8,
    #[serde(default)]
    pub show_unread_badge: bool,
    #[serde(default)]
    pub show_continue_button: bool,
    #[serde(default = "default_true")]
    pub show_category_tabs: bool,
    #[serde(default = "default_true")]
    pub show_item_count: bool,
}

fn default_display_mode() -> String { "comfortable".to_string() }
fn default_card_size() -> u8 { 8 }
fn default_true() -> bool { true }

impl Default for LibraryDisplay {
    fn default() -> Self {
        Self {
            display_mode: default_display_mode(),
            card_size: default_card_size(),
            show_unread_badge: false,
            show_continue_button: false,
            show_category_tabs: true,
            show_item_count: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SourceDisplay {
    #[serde(default = "default_display_mode")]
    pub display_mode: String,
    #[serde(default = "default_card_size")]
    pub card_size: u8,
    #[serde(default)]
    pub show_unread_badge: bool,
    #[serde(default)]
    pub show_continue_button: bool,
}

impl Default for SourceDisplay {
    fn default() -> Self {
        Self {
            display_mode: default_display_mode(),
            card_size: default_card_size(),
            show_unread_badge: false,
            show_continue_button: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SourceFilters {
    #[serde(default)]
    pub reading_status: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct LibraryFilters {
    #[serde(default)]
    pub sources: Vec<String>,
    #[serde(default)]
    pub reading_status: Vec<String>,
}

fn default_categories() -> Vec<Category> {
    vec![Category::default_category()]
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Config {
    #[serde(default)]
    pub root_directory: Option<String>,
    #[serde(default)]
    pub reader_settings: ReaderSettings,
    #[serde(default)]
    pub library_filters: LibraryFilters,
    #[serde(default)]
    pub active_category: Option<String>,
    #[serde(default, alias = "sort_preference")]
    pub library_sort_preference: SortPreference,
    #[serde(default = "default_source_sort_preference")]
    pub source_sort_preference: SortPreference,
    #[serde(default)]
    pub library_display: LibraryDisplay,
    #[serde(default)]
    pub source_display: SourceDisplay,
    #[serde(default)]
    pub source_filters: SourceFilters,
    #[serde(default = "default_categories")]
    pub categories: Vec<Category>,
}

// ── Config helpers ───────────────────────────────────────────────────────────

pub fn config_path(app: &tauri::AppHandle) -> std::path::PathBuf {
    app.path().app_data_dir().unwrap().join("config.json")
}

pub fn load_config(app: &tauri::AppHandle) -> Config {
    let mut config: Config = fs::read_to_string(config_path(app))
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    // Always ensure default category exists
    if !config.categories.iter().any(|c| c.id == DEFAULT_CATEGORY_ID) {
        config.categories.insert(0, Category::default_category());
    }
    config
}

pub fn save_config(app: &tauri::AppHandle, config: &Config) -> Result<(), String> {
    crate::utils::write_atomic_json(&config_path(app), config)
}

// ── Root directory ───────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_root_directory(app: tauri::AppHandle) -> Option<String> {
    load_config(&app).root_directory
}

#[tauri::command]
pub fn set_root_directory(app: tauri::AppHandle, path: String) -> Result<(), String> {
    let mut config = load_config(&app);
    config.root_directory = Some(path);
    save_config(&app, &config)
}

// ── Default reader settings ──────────────────────────────────────────────────

#[tauri::command]
pub fn get_default_reader_settings(app: tauri::AppHandle) -> ReaderSettings {
    load_config(&app).reader_settings
}

/// Merges a patch into the global default reader settings in `config.json`.
/// Only fields present in the patch overwrite existing values, so partial
/// updates don't clobber other reader fields.
#[tauri::command]
pub fn set_default_reader_settings(
    app: tauri::AppHandle,
    settings: ReaderSettings,
) -> Result<(), String> {
    let mut config = load_config(&app);
    if settings.fit_mode.is_some() { config.reader_settings.fit_mode = settings.fit_mode; }
    if settings.reading_mode.is_some() { config.reader_settings.reading_mode = settings.reading_mode; }
    if settings.webtoon_padding.is_some() { config.reader_settings.webtoon_padding = settings.webtoon_padding; }
    save_config(&app, &config)
}

// ── Active category tab ──────────────────────────────────────────────────────

#[tauri::command]
pub fn get_active_category(app: tauri::AppHandle) -> Option<String> {
    load_config(&app).active_category
}

#[tauri::command]
pub fn set_active_category(app: tauri::AppHandle, category_id: String) -> Result<(), String> {
    let mut config = load_config(&app);
    config.active_category = Some(category_id);
    save_config(&app, &config)
}

// ── Library sort preference ──────────────────────────────────────────────────

#[tauri::command]
pub fn get_library_sort_preference(app: tauri::AppHandle) -> SortPreference {
    load_config(&app).library_sort_preference
}

#[tauri::command]
pub fn set_library_sort_preference(
    app: tauri::AppHandle,
    preference: SortPreference,
) -> Result<(), String> {
    let mut config = load_config(&app);
    config.library_sort_preference = preference;
    save_config(&app, &config)
}

// ── Library display ──────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_library_display(app: tauri::AppHandle) -> LibraryDisplay {
    load_config(&app).library_display
}

#[tauri::command]
pub fn set_library_display(
    app: tauri::AppHandle,
    display: LibraryDisplay,
) -> Result<(), String> {
    let mut config = load_config(&app);
    config.library_display = display;
    save_config(&app, &config)
}

// ── Library filters ──────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_library_filters(app: tauri::AppHandle) -> LibraryFilters {
    load_config(&app).library_filters
}

#[tauri::command]
pub fn set_library_filters(app: tauri::AppHandle, filters: LibraryFilters) -> Result<(), String> {
    let mut config = load_config(&app);
    config.library_filters = filters;
    save_config(&app, &config)
}

// ── Source sort preference ───────────────────────────────────────────────────

#[tauri::command]
pub fn get_source_sort_preference(app: tauri::AppHandle) -> SortPreference {
    load_config(&app).source_sort_preference
}

#[tauri::command]
pub fn set_source_sort_preference(
    app: tauri::AppHandle,
    preference: SortPreference,
) -> Result<(), String> {
    let mut config = load_config(&app);
    config.source_sort_preference = preference;
    save_config(&app, &config)
}

// ── Source display ───────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_source_display(app: tauri::AppHandle) -> SourceDisplay {
    load_config(&app).source_display
}

#[tauri::command]
pub fn set_source_display(app: tauri::AppHandle, display: SourceDisplay) -> Result<(), String> {
    let mut config = load_config(&app);
    config.source_display = display;
    save_config(&app, &config)
}

// ── Source filters ───────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_source_filters(app: tauri::AppHandle) -> SourceFilters {
    load_config(&app).source_filters
}

#[tauri::command]
pub fn set_source_filters(app: tauri::AppHandle, filters: SourceFilters) -> Result<(), String> {
    let mut config = load_config(&app);
    config.source_filters = filters;
    save_config(&app, &config)
}
