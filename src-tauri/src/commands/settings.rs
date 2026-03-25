use serde::{Deserialize, Serialize};
use std::fs;
use tauri::Manager;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Settings {
    pub fit_mode: Option<String>,
    pub reading_mode: Option<String>,
}

fn global_path(app: &tauri::AppHandle) -> std::path::PathBuf {
    app.path().app_data_dir().unwrap().join("settings.json")
}

fn manga_path(app: &tauri::AppHandle, manga_id: &str) -> std::path::PathBuf {
    app.path()
        .app_data_dir()
        .unwrap()
        .join("settings")
        .join(format!("{manga_id}.json"))
}

fn load(path: &std::path::Path) -> Option<Settings> {
    fs::read_to_string(path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
}

fn save(path: &std::path::Path, settings: &Settings) -> Result<(), String> {
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
    let global = load(&global_path(&app)).unwrap_or_default();

    match manga_id {
        Some(id) => {
            let manga = load(&manga_path(&app, &id));
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
    let path = match manga_id {
        Some(id) => manga_path(&app, &id),
        None => global_path(&app),
    };
    save(&path, &settings)
}
