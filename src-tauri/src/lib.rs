mod commands;
mod error;
mod models;
mod paths;
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
            std::fs::create_dir_all(paths::data_dir(app.handle())?)?;

            // Load the manga_db cache into managed state.
            let cache = commands::manga_db::MangaDbCache::load(app.handle())?;
            app.manage(Mutex::new(cache));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::sources::scan_directory,
            commands::sources::list_sources,
            commands::sources::add_source,
            commands::sources::relocate_source,
            commands::sources::remove_source,
            commands::sources::rename_source,
            commands::sources::reorder_sources,
            commands::sources::set_source_hidden,
            commands::library::get_categories,
            commands::library::create_category,
            commands::library::rename_category,
            commands::library::delete_category,
            commands::library::reorder_categories,
            commands::library::get_library,
            commands::library::add_to_library,
            commands::library::remove_from_library,
            commands::library::add_mangas_to_categories,
            commands::library::remove_mangas_from_library,
            commands::library::remove_mangas_from_category,
            commands::library::is_in_library,
            commands::reader::get_chapters,
            commands::reader::open_chapter,
            commands::reader::set_chapter_progress,
            commands::reader::mark_chapter_read,
            commands::reader::mark_mangas_read,
            commands::reader::get_manga_reader_settings,
            commands::reader::set_manga_reader_settings,
            commands::settings::get_default_reader_settings,
            commands::settings::set_default_reader_settings,
            commands::settings::get_root_directory,
            commands::settings::set_root_directory,
            commands::settings::get_library_filters,
            commands::settings::set_library_filters,
            commands::settings::get_active_category,
            commands::settings::set_active_category,
            commands::settings::get_library_sort_preference,
            commands::settings::set_library_sort_preference,
            commands::settings::get_source_sort_preference,
            commands::settings::set_source_sort_preference,
            commands::settings::get_library_display,
            commands::settings::set_library_display,
            commands::settings::get_source_display,
            commands::settings::set_source_display,
            commands::settings::get_source_filters,
            commands::settings::set_source_filters,
            commands::history::get_history,
            commands::history::record_history,
            commands::history::delete_history_entry,
            commands::history::clear_history,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
