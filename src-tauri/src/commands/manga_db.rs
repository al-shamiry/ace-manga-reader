use std::sync::{Mutex, MutexGuard};

use crate::error::{AppError, AppResult};
use crate::models::{MangaDb, MangaRecord};
use crate::paths;
use crate::utils::write_atomic_json;

// ── Cache struct ─────────────────────────────────────────────────────────────

pub struct MangaDbCache {
    pub db: MangaDb,
}

impl MangaDbCache {
    pub fn load(app: &tauri::AppHandle) -> AppResult<Self> {
        Ok(Self { db: load_db(app)? })
    }
}

// ── File I/O ──────────────────────────────────────────────────────────────────

fn load_db(app: &tauri::AppHandle) -> AppResult<MangaDb> {
    let path = paths::db_file(app)?;
    // A missing or unreadable file is treated as an empty database.
    Ok(std::fs::read_to_string(path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default())
}

pub(crate) fn save_db(app: &tauri::AppHandle, db: &MangaDb) -> AppResult<()> {
    write_atomic_json(&paths::db_file(app)?, db)
}

// ── Locking + mutation API ────────────────────────────────────────────────────

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
