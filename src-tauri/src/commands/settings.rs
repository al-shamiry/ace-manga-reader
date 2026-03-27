use serde::{Deserialize, Serialize};
use std::fs;
use tauri::Manager;

// ── Per-manga reader settings (settings/{manga_id}.json) ─────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub fit_mode: Option<String>,
    pub reading_mode: Option<String>,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            fit_mode: Some("fit-screen".to_string()),
            reading_mode: Some("paged-rtl".to_string()),
        }
    }
}

fn manga_settings_path(app: &tauri::AppHandle, manga_id: &str) -> std::path::PathBuf {
    app.path()
        .app_data_dir()
        .unwrap()
        .join("settings")
        .join(format!("{manga_id}.json"))
}

fn load_settings(path: &std::path::Path) -> Option<Settings> {
    fs::read_to_string(path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
}

fn save_settings(path: &std::path::Path, settings: &Settings) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())
}

/// Returns manga-specific settings merged with global defaults.
/// Fields set in the manga file take priority; missing fields fall back to global.
#[tauri::command]
pub fn get_settings(app: tauri::AppHandle, manga_id: Option<String>) -> Settings {
    let config = load_config(&app);
    let global = Settings {
        fit_mode: config.fit_mode,
        reading_mode: config.reading_mode,
    };

    match manga_id {
        Some(id) => {
            let manga = load_settings(&manga_settings_path(&app, &id));
            match manga {
                Some(m) => Settings {
                    fit_mode: m.fit_mode.or(global.fit_mode),
                    reading_mode: m.reading_mode.or(global.reading_mode),
                },
                None => global,
            }
        }
        None => global,
    }
}

#[tauri::command]
pub fn set_settings(
    app: tauri::AppHandle,
    settings: Settings,
    manga_id: Option<String>,
) -> Result<(), String> {
    match manga_id {
        Some(id) => save_settings(&manga_settings_path(&app, &id), &settings),
        None => {
            let mut config = load_config(&app);
            config.fit_mode = settings.fit_mode;
            config.reading_mode = settings.reading_mode;
            save_config(&app, &config)
        }
    }
}

// ── Unified config.json ──────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SortPreference {
    #[serde(default = "default_sort_field")]
    pub field: String,
    #[serde(default = "default_sort_direction")]
    pub direction: String,
}

fn default_sort_field() -> String { "last_read".to_string() }
fn default_sort_direction() -> String { "desc".to_string() }

impl Default for SortPreference {
    fn default() -> Self {
        Self {
            field: default_sort_field(),
            direction: default_sort_direction(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Config {
    #[serde(default)]
    pub root_directory: Option<String>,
    #[serde(default)]
    pub fit_mode: Option<String>,
    #[serde(default)]
    pub reading_mode: Option<String>,
    #[serde(default)]
    pub library_filters: LibraryFilters,
    #[serde(default)]
    pub active_category: Option<String>,
    #[serde(default)]
    pub sort_preference: SortPreference,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct LibraryFilters {
    #[serde(default)]
    pub sources: Vec<String>,
    #[serde(default)]
    pub reading_status: Vec<String>,
}

pub fn config_path(app: &tauri::AppHandle) -> std::path::PathBuf {
    app.path().app_data_dir().unwrap().join("config.json")
}

pub fn load_config(app: &tauri::AppHandle) -> Config {
    fs::read_to_string(config_path(app))
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_else(|| {
            let defaults = Settings::default();
            Config {
                fit_mode: defaults.fit_mode,
                reading_mode: defaults.reading_mode,
                ..Default::default()
            }
        })
}

pub fn save_config(app: &tauri::AppHandle, config: &Config) -> Result<(), String> {
    let path = config_path(app);
    let json = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())
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

// ── Sort preference ─────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_sort_preference(app: tauri::AppHandle) -> SortPreference {
    load_config(&app).sort_preference
}

#[tauri::command]
pub fn set_sort_preference(
    app: tauri::AppHandle,
    preference: SortPreference,
) -> Result<(), String> {
    let mut config = load_config(&app);
    config.sort_preference = preference;
    save_config(&app, &config)
}
