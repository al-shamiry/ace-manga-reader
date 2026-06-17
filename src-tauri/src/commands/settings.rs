use serde::{Deserialize, Serialize};
use std::fs;

use crate::error::AppResult;
use crate::models::{Category, DEFAULT_CATEGORY_ID};
use crate::paths;
use crate::utils::write_atomic_json;

// ── Types ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "kebab-case")]
pub enum FitMode {
    FitWidth,
    FitHeight,
    Original,
    Stretch,
    #[default]
    #[serde(other)]
    FitScreen,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "kebab-case")]
pub enum ReadingMode {
    PagedLtr,
    PagedVertical,
    Webtoon,
    #[default]
    #[serde(other)]
    PagedRtl,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct ReaderSettings {
    pub fit_mode: Option<FitMode>,
    pub reading_mode: Option<ReadingMode>,
    pub webtoon_padding: Option<u8>,
}

impl Default for ReaderSettings {
    fn default() -> Self {
        Self {
            fit_mode: Some(FitMode::default()),
            reading_mode: Some(ReadingMode::default()),
            webtoon_padding: None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "kebab-case")]
pub enum SortField {
    Alphabetical,
    TotalChapters,
    DateAdded,
    #[default]
    #[serde(other)]
    LastRead,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "kebab-case")]
pub enum SortDirection {
    Asc,
    #[default]
    #[serde(other)]
    Desc,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "kebab-case")]
pub enum DisplayMode {
    Compact,
    CoverOnly,
    List,
    #[default]
    #[serde(other)]
    Comfortable,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct LibrarySortPreference {
    pub field: SortField,
    pub direction: SortDirection,
}

impl Default for LibrarySortPreference {
    fn default() -> Self {
        Self {
            field: SortField::LastRead,
            direction: SortDirection::Desc,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct SourceSortPreference {
    pub field: SortField,
    pub direction: SortDirection,
}

impl Default for SourceSortPreference {
    fn default() -> Self {
        Self {
            field: SortField::Alphabetical,
            direction: SortDirection::Asc,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct LibraryDisplay {
    pub display_mode: DisplayMode,
    pub card_size: u8,
    pub show_unread_badge: bool,
    pub show_continue_button: bool,
    pub show_category_tabs: bool,
    pub show_item_count: bool,
}

impl Default for LibraryDisplay {
    fn default() -> Self {
        Self {
            display_mode: DisplayMode::Comfortable,
            card_size: 8u8,
            show_unread_badge: false,
            show_continue_button: false,
            show_category_tabs: true,
            show_item_count: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct SourceDisplay {
    pub display_mode: DisplayMode,
    pub card_size: u8,
    pub show_unread_badge: bool,
    pub show_continue_button: bool,
}

impl Default for SourceDisplay {
    fn default() -> Self {
        Self {
            display_mode: DisplayMode::Comfortable,
            card_size: 8u8,
            show_unread_badge: false,
            show_continue_button: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
pub struct SourceFilters {
    pub reading_status: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
pub struct LibraryFilters {
    pub sources: Vec<String>,
    pub reading_status: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
pub struct Config {
    pub root_directory: Option<String>,
    pub reader_settings: ReaderSettings,
    pub active_category: Option<String>,
    pub library_sort_preference: LibrarySortPreference,
    pub library_display: LibraryDisplay,
    pub library_filters: LibraryFilters,
    pub source_sort_preference: SourceSortPreference,
    pub source_display: SourceDisplay,
    pub source_filters: SourceFilters,
    pub categories: Vec<Category>,
}

impl Config {
    fn normalize(mut self) -> Self {
        if !self.categories.iter().any(|c| c.id == DEFAULT_CATEGORY_ID) {
            self.categories.insert(0, Category::default());
        }
        self
    }
}

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

// ── Root directory ───────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_root_directory(app: tauri::AppHandle) -> AppResult<Option<String>> {
    Ok(load_config(&app)?.root_directory)
}

#[tauri::command]
pub fn set_root_directory(app: tauri::AppHandle, path: String) -> AppResult<()> {
    let mut config = load_config(&app)?;
    config.root_directory = Some(path);
    save_config(&app, &config)
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
    let mut config = load_config(&app)?;
    config.reader_settings = settings;
    save_config(&app, &config)
}

// ── Active category tab ──────────────────────────────────────────────────────

#[tauri::command]
pub fn get_active_category(app: tauri::AppHandle) -> AppResult<Option<String>> {
    Ok(load_config(&app)?.active_category)
}

#[tauri::command]
pub fn set_active_category(app: tauri::AppHandle, category_id: String) -> AppResult<()> {
    let mut config = load_config(&app)?;
    config.active_category = Some(category_id);
    save_config(&app, &config)
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
    let mut config = load_config(&app)?;
    config.library_sort_preference = preference;
    save_config(&app, &config)
}

// ── Library display ──────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_library_display(app: tauri::AppHandle) -> AppResult<LibraryDisplay> {
    Ok(load_config(&app)?.library_display)
}

#[tauri::command]
pub fn set_library_display(app: tauri::AppHandle, display: LibraryDisplay) -> AppResult<()> {
    let mut config = load_config(&app)?;
    config.library_display = display;
    save_config(&app, &config)
}

// ── Library filters ──────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_library_filters(app: tauri::AppHandle) -> AppResult<LibraryFilters> {
    Ok(load_config(&app)?.library_filters)
}

#[tauri::command]
pub fn set_library_filters(app: tauri::AppHandle, filters: LibraryFilters) -> AppResult<()> {
    let mut config = load_config(&app)?;
    config.library_filters = filters;
    save_config(&app, &config)
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
    let mut config = load_config(&app)?;
    config.source_sort_preference = preference;
    save_config(&app, &config)
}

// ── Source display ───────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_source_display(app: tauri::AppHandle) -> AppResult<SourceDisplay> {
    Ok(load_config(&app)?.source_display)
}

#[tauri::command]
pub fn set_source_display(app: tauri::AppHandle, display: SourceDisplay) -> AppResult<()> {
    let mut config = load_config(&app)?;
    config.source_display = display;
    save_config(&app, &config)
}

// ── Source filters ───────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_source_filters(app: tauri::AppHandle) -> AppResult<SourceFilters> {
    Ok(load_config(&app)?.source_filters)
}

#[tauri::command]
pub fn set_source_filters(app: tauri::AppHandle, filters: SourceFilters) -> AppResult<()> {
    let mut config = load_config(&app)?;
    config.source_filters = filters;
    save_config(&app, &config)
}
