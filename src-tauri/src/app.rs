//! Application bootstrap: the Tauri `setup` hook that prepares the data
//! directory and loads the manga DB cache into managed state.

use std::sync::Mutex;

use tauri::Manager;

use crate::{infra, store};

/// Ensure the data dir exists and load the manga DB cache into managed state.
pub(crate) fn setup(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    std::fs::create_dir_all(infra::paths::data_dir(app.handle())?)?;

    let cache = store::db::MangaDbCache::load(app.handle())?;
    app.manage(Mutex::new(cache));

    Ok(())
}
