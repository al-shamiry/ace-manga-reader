mod commands;
mod models;
mod utils;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .setup(|app| {
            let data_dir = app.handle().path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;

            // Migrate old categories.json + library.json → unified library.json
            let old_categories = data_dir.join("categories.json");
            if old_categories.exists() {
                use crate::models::category::{Category, LibraryData, LibraryEntry};
                use std::collections::HashMap;

                let categories: Vec<Category> = std::fs::read_to_string(&old_categories)
                    .ok()
                    .and_then(|s| serde_json::from_str(&s).ok())
                    .unwrap_or_default();

                let library_path = data_dir.join("library.json");
                let entries: HashMap<String, LibraryEntry> = std::fs::read_to_string(&library_path)
                    .ok()
                    .and_then(|s| serde_json::from_str(&s).ok())
                    .unwrap_or_default();

                let merged = LibraryData { categories, entries };
                let json = serde_json::to_string_pretty(&merged)
                    .expect("failed to serialize library data");
                std::fs::write(&library_path, json)?;
                std::fs::remove_file(&old_categories)?;
            }

            // Migrate settings.json + root_directory.txt + library_filters.json → config.json
            let config_path = data_dir.join("config.json");
            if !config_path.exists() {
                let old_settings_path = data_dir.join("settings.json");
                let old_root_path = data_dir.join("root_directory.txt");
                let old_filters_path = data_dir.join("library_filters.json");

                let old_settings: Option<commands::settings::Settings> =
                    std::fs::read_to_string(&old_settings_path)
                        .ok()
                        .and_then(|s| serde_json::from_str(&s).ok());
                let old_root: Option<String> = std::fs::read_to_string(&old_root_path)
                    .ok()
                    .map(|s| s.trim().to_string())
                    .filter(|s| !s.is_empty());
                let old_filters: Option<commands::settings::LibraryFilters> =
                    std::fs::read_to_string(&old_filters_path)
                        .ok()
                        .and_then(|s| serde_json::from_str(&s).ok());

                let defaults = commands::settings::Settings::default();
                let settings = old_settings.unwrap_or(defaults);

                let config = commands::settings::Config {
                    root_directory: old_root,
                    fit_mode: settings.fit_mode,
                    reading_mode: settings.reading_mode,
                    library_filters: old_filters.unwrap_or_default(),
                    active_category: None,
                    sort_preference: Default::default(),
                    library_display: Default::default(),
                };
                let json = serde_json::to_string_pretty(&config)
                    .expect("failed to serialize config");
                std::fs::write(&config_path, json)?;

                // Clean up old files
                let _ = std::fs::remove_file(&old_settings_path);
                let _ = std::fs::remove_file(&old_root_path);
                let _ = std::fs::remove_file(&old_filters_path);
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::library::scan_directory,
            commands::library::list_sources,
            commands::reader::get_chapters,
            commands::reader::open_chapter,
            commands::reader::set_chapter_progress,
            commands::reader::mark_chapter_read,
            commands::settings::get_settings,
            commands::settings::set_settings,
            commands::settings::get_root_directory,
            commands::settings::set_root_directory,
            commands::categories::get_categories,
            commands::categories::create_category,
            commands::categories::rename_category,
            commands::categories::delete_category,
            commands::categories::reorder_categories,
            commands::categories::get_library,
            commands::categories::add_to_library,
            commands::categories::remove_from_library,
            commands::categories::is_in_library,
            commands::settings::get_library_filters,
            commands::settings::set_library_filters,
            commands::settings::get_active_category,
            commands::settings::set_active_category,
            commands::settings::get_sort_preference,
            commands::settings::set_sort_preference,
            commands::settings::get_library_display,
            commands::settings::set_library_display,
            commands::history::get_history,
            commands::history::record_history,
            commands::history::delete_history_entry,
            commands::history::clear_history,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
