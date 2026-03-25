mod commands;
mod models;
mod utils;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let data_dir = app.handle().path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;
            let settings_path = data_dir.join("settings.json");
            if !settings_path.exists() {
                let defaults = commands::settings::Settings::default();
                let json = serde_json::to_string_pretty(&defaults)
                    .expect("failed to serialize default settings");
                std::fs::write(&settings_path, json)?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::library::scan_directory,
            commands::library::get_last_directory,
            commands::library::get_root_directory,
            commands::library::set_root_directory,
            commands::library::list_sources,
            commands::reader::get_chapters,
            commands::reader::open_chapter,
            commands::reader::set_chapter_progress,
            commands::reader::mark_chapter_read,
            commands::settings::get_settings,
            commands::settings::set_settings,
            commands::categories::get_categories,
            commands::categories::create_category,
            commands::categories::rename_category,
            commands::categories::delete_category,
            commands::categories::reorder_categories,
            commands::categories::get_library,
            commands::categories::add_to_library,
            commands::categories::remove_from_library,
            commands::categories::is_in_library,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
