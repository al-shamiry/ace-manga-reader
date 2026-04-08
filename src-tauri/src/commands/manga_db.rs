use std::path::Path;
use std::sync::Mutex;

use tauri::Manager;

use crate::models::manga_db::{MangaDb, MangaState};
use crate::utils::{path_id, write_atomic_json};

// ── Cache struct ─────────────────────────────────────────────────────────────

pub struct MangaDbCache {
    pub db: MangaDb,
}

impl MangaDbCache {
    pub fn load(app: &tauri::AppHandle) -> Self {
        let db = load_db(app);
        Self { db }
    }
}

// ── File I/O ──────────────────────────────────────────────────────────────────

pub(crate) fn db_path(app: &tauri::AppHandle) -> std::path::PathBuf {
    app.path().app_data_dir().unwrap().join("manga_db.json")
}

fn load_db(app: &tauri::AppHandle) -> MangaDb {
    std::fs::read_to_string(db_path(app))
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

pub(crate) fn save_db(app: &tauri::AppHandle, db: &MangaDb) -> Result<(), String> {
    write_atomic_json(&db_path(app), db)
}

// ── Mutation API ──────────────────────────────────────────────────────────────

/// Run `f` under the cache lock and write-through to disk.
pub(crate) fn mutate<F>(
    cache: &Mutex<MangaDbCache>,
    app: &tauri::AppHandle,
    f: F,
) -> Result<(), String>
where
    F: FnOnce(&mut MangaDb),
{
    let mut guard = cache.lock().map_err(|e| e.to_string())?;
    f(&mut guard.db);
    save_db(app, &guard.db)
}

/// Clone the `MangaState` for `manga_id`, if it exists.
pub(crate) fn get_manga(cache: &Mutex<MangaDbCache>, manga_id: &str) -> Option<MangaState> {
    let guard = cache.lock().ok()?;
    guard.db.mangas.get(manga_id).cloned()
}

/// Clone all `MangaState` rows whose `source_id` matches.
pub(crate) fn mangas_for_source(
    cache: &Mutex<MangaDbCache>,
    source_id: &str,
) -> Vec<MangaState> {
    let guard = match cache.lock() {
        Ok(g) => g,
        Err(_) => return Vec::new(),
    };
    guard
        .db
        .mangas
        .values()
        .filter(|m| m.source_id == source_id)
        .cloned()
        .collect()
}

/// Derive `source_id` from `manga_path` (the immediate parent directory).
pub(crate) fn source_id_for_manga(manga_path: &Path) -> Option<String> {
    manga_path.parent().map(path_id)
}
