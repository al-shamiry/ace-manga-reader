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

            // Stage 4.1 migration: if this install has a root_directory hint but no
            // persisted sources, import every immediate subdir as a source (preserves
            // pre-4.1 installs that lazily populated sources through scan_directory).
            // Backfill of existing SourceMeta fields is handled inside MangaDbCache::load.
            let root = commands::settings::load_config(app.handle()).root_directory;
            if let Some(root_path) = root {
                let cache = app.state::<Mutex<commands::manga_db::MangaDbCache>>();
                let should_import = cache.lock().map(|g| g.db.sources.is_empty()).unwrap_or(false);
                if should_import {
                    if let Ok(rd) = std::fs::read_dir(&root_path) {
                        let mut subdirs: Vec<_> = rd
                            .filter_map(|e| e.ok())
                            .map(|e| e.path())
                            .filter(|p| p.is_dir())
                            .collect();
                        subdirs.sort();
                        for sub in subdirs {
                            let _ = commands::library::add_source_internal(app.handle(), &sub, None);
                        }
                    }
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::library::scan_directory,
            commands::library::list_sources,
            commands::library::add_source,
            commands::library::remove_source,
            commands::library::rename_source,
            commands::library::reorder_sources,
            commands::library::set_source_hidden,
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
