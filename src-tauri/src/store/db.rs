//! In-memory cache of `manga_db.json` held in Tauri managed state, plus the
//! locking + write-through mutation API every command and service uses to read
//! or change persisted source/manga state.

use std::sync::{Mutex, MutexGuard};

use crate::error::{AppError, AppResult};
use crate::infra::atomic::write_atomic_json;
use crate::infra::paths;
use crate::models::{MangaDb, MangaRecord};

/// The loaded database, wrapped in managed state as `Mutex<MangaDbCache>`.
pub struct MangaDbCache {
    pub db: MangaDb,
}

impl MangaDbCache {
    /// Load the database from disk (missing or corrupt → empty).
    pub fn load(app: &tauri::AppHandle) -> AppResult<Self> {
        Ok(Self { db: load_db(app)? })
    }
}

/// Lock the cache, mapping a poisoned mutex to [`AppError::Lock`].
pub(crate) fn lock(cache: &Mutex<MangaDbCache>) -> AppResult<MutexGuard<'_, MangaDbCache>> {
    cache.lock().map_err(|_| AppError::Lock)
}

/// Run `f` under the cache lock and write-through to disk.
pub(crate) fn mutate<F>(cache: &Mutex<MangaDbCache>, app: &tauri::AppHandle, f: F) -> AppResult<()>
where
    F: FnOnce(&mut MangaDb),
{
    let mut guard = lock(cache)?;
    f(&mut guard.db);
    save_db(app, &guard.db)
}

/// Clone the `MangaRecord` for `manga_id`, if it exists.
pub(crate) fn get_manga(
    cache: &Mutex<MangaDbCache>,
    manga_id: &str,
) -> AppResult<Option<MangaRecord>> {
    let guard = lock(cache)?;
    Ok(guard.db.mangas.get(manga_id).cloned())
}

/// Persist the database atomically.
pub(crate) fn save_db(app: &tauri::AppHandle, db: &MangaDb) -> AppResult<()> {
    write_atomic_json(&paths::db_file(app)?, db)
}

// ── Loading ──────────────────────────────────────────────────────────────────

/// A missing or unreadable file is treated as an empty database.
fn load_db(app: &tauri::AppHandle) -> AppResult<MangaDb> {
    let path = paths::db_file(app)?;
    Ok(std::fs::read_to_string(path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default())
}
