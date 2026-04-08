mod commands;
mod models;
mod utils;

use std::sync::Mutex;
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

            // Load the manga_db cache into managed state
            app.manage(Mutex::new(commands::manga_db::MangaDbCache::load(app.handle())));

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
