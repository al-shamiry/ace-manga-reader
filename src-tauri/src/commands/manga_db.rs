use std::path::Path;
use std::sync::Mutex;

use tauri::Manager;

use crate::models::manga_db::{MangaDb, MangaState};
use crate::utils::{natural_cmp, now_epoch, write_atomic_json};

// ── Cache struct ─────────────────────────────────────────────────────────────

pub struct MangaDbCache {
    pub db: MangaDb,
}

impl MangaDbCache {
    pub fn load(app: &tauri::AppHandle) -> Self {
        let mut db = load_db(app);
        if backfill(&mut db) {
            let _ = save_db(app, &db);
        }
        Self { db }
    }
}

fn backfill(db: &mut MangaDb) -> bool {
    let mut changed = false;

    for meta in db.sources.values_mut() {
        if meta.name.is_empty() {
            meta.name = Path::new(&meta.source_path)
                .file_name()
                .and_then(|s| s.to_str())
                .unwrap_or("")
                .to_string();
            changed = true;
        }
        if meta.added_at == 0 {
            meta.added_at = now_epoch();
            changed = true;
        }
    }

    if db.version < 2 {
        // Assign sort_order by natural sort of names, matching today's UI order
        let mut id_name_pairs: Vec<(String, String)> = db.sources
            .iter()
            .map(|(id, meta)| (id.clone(), meta.name.clone()))
            .collect();
        id_name_pairs.sort_by(|a, b| natural_cmp(&a.1, &b.1));
        for (i, (id, _)) in id_name_pairs.iter().enumerate() {
            if let Some(meta) = db.sources.get_mut(id) {
                meta.sort_order = i as u32;
            }
        }
        db.version = 2;
        changed = true;
    }

    changed
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
