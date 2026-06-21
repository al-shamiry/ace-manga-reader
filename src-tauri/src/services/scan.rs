//! Source-folder scanning: discover mangas on disk (image subdirs + CBZs),
//! reconcile them against the DB, and the small source-record helpers
//! (ensure, project) the source commands build on.

use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};

use rayon::prelude::*;

use crate::error::{AppError, AppResult};
use crate::infra::archive;
use crate::infra::image::{images_in, subdirs_and_cbz};
use crate::infra::naming::{natural_cmp, normalize, now_epoch, path_id, title_from_path};
use crate::infra::paths;
use crate::models::{MangaDb, MangaDto, SourceDto, SourceRecord};
use crate::store::db::{self, DbExt};

/// Cache-aware scan of a source directory into its mangas. On a cache hit (the
/// source is known and has mangas) returns the stored projection; otherwise
/// walks the disk, reconciles the DB, and returns the fresh list.
pub(crate) fn scan_source(
    app: &tauri::AppHandle,
    dir: &Path,
    source_id: &str,
    force_refresh: bool,
) -> AppResult<Vec<MangaDto>> {
    let cache = app.db();

    if !force_refresh {
        let guard = db::lock(&cache)?;
        if guard.db.sources.contains_key(source_id)
            && guard.db.mangas.values().any(|m| m.source_id == source_id)
        {
            return Ok(mangas_for_source(&guard.db, source_id));
        }
    }

    // Full disk scan.
    let covers_dir = paths::covers_dir(app)?;
    fs::create_dir_all(&covers_dir)?;
    let mangas = collect_mangas(dir, 1, &covers_dir);

    let scanned_at = now_epoch();
    db::mutate(&cache, app, |db| {
        sync_source_mangas(db, source_id, dir, scanned_at, &mangas);
    })?;

    let guard = db::lock(&cache)?;
    Ok(mangas_for_source(&guard.db, source_id))
}

/// Insert a source for `dir` if one doesn't already exist. Returns its id either way.
pub(crate) fn ensure_source(
    app: &tauri::AppHandle,
    dir: &Path,
    name: Option<String>,
) -> AppResult<String> {
    let id = path_id(dir);
    let cache = app.db();
    {
        let guard = db::lock(&cache)?;
        if guard.db.sources.contains_key(&id) {
            return Ok(id);
        }
    }

    let source_path = normalize(dir);
    let resolved_name = resolve_source_name(dir, name);
    let manga_count = count_mangas(dir);
    db::mutate(&cache, app, |db| {
        // Re-check under the lock: another caller may have inserted it meanwhile.
        if !db.sources.contains_key(&id) {
            let order = db.next_source_order();
            db.sources.insert(
                id.clone(),
                SourceRecord::new(source_path, resolved_name, manga_count, order),
            );
        }
    })?;
    Ok(id)
}

/// Project a source record into its DTO, erroring if it doesn't exist.
pub(crate) fn project_source(db: &MangaDb, id: &str) -> AppResult<SourceDto> {
    db.sources
        .get(id)
        .map(|source| source.project(id))
        .ok_or_else(|| AppError::NotFound(format!("source '{}' not found", id)))
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/// Find the cover from explicit cover files or the first issue's first image.
fn find_folder_cover(manga_path: &Path, sub_dirs: &[PathBuf]) -> Option<String> {
    for name in &["cover.png", "cover.jpg", "cover.jpeg", "cover.webp"] {
        let candidate = manga_path.join(name);
        if candidate.is_file() {
            return Some(normalize(&candidate));
        }
    }
    let first_issue = sub_dirs.first()?;
    let first_image = images_in(first_issue).into_iter().next()?;
    Some(normalize(&first_image))
}

/// Scan a manga folder that may contain CBZ files, image subdirs, or both.
/// Returns `None` if the folder has no chapters.
fn scan_manga(path: &Path, cache_dir: &Path) -> Option<AppResult<MangaDto>> {
    let (sub_dirs, cbz_files) = subdirs_and_cbz(path);
    let chapter_count = sub_dirs.len() + cbz_files.len();

    if chapter_count == 0 {
        return None;
    }

    let id = path_id(path);

    // Cover priority: explicit cover file > first image subdir > first CBZ
    let cover_result = find_folder_cover(path, &sub_dirs).map(Ok).or_else(|| {
        cbz_files
            .first()
            .map(|cbz| archive::extract_cover(cbz, &id, cache_dir))
    });

    let cover_path = match cover_result {
        Some(Ok(p)) => p,
        Some(Err(e)) => return Some(Err(e)),
        None => return Some(Err(AppError::Invalid("No cover found".to_string()))),
    };

    Some(Ok(MangaDto {
        id,
        title: title_from_path(path),
        path: normalize(path),
        cover_path,
        chapter_count,
        read_chapters: 0,
        last_read_at: 0,
        category_ids: Vec::new(),
        added_at: 0,
    }))
}

/// Collect all mangas found within `dir`, searching up to `depth` levels deep.
fn collect_mangas(dir: &Path, depth: u32, cache_dir: &Path) -> Vec<MangaDto> {
    let entries: Vec<PathBuf> = match fs::read_dir(dir) {
        Ok(rd) => rd
            .filter_map(|e| e.ok())
            .map(|e| e.path())
            .filter(|p| p.is_dir())
            .collect(),
        Err(e) => {
            eprintln!("Cannot read {:?}: {}", dir, e);
            return Vec::new();
        }
    };

    entries
        .par_iter()
        .flat_map(|entry| match scan_manga(entry, cache_dir) {
            Some(Ok(manga)) => vec![manga],
            Some(Err(e)) => {
                eprintln!("Skipping manga {:?}: {}", entry, e);
                vec![]
            }
            None if depth > 0 => collect_mangas(entry, depth - 1, cache_dir),
            None => vec![],
        })
        .collect()
}

/// Count mangas by immediate subdirectory count in the source directory.
fn count_mangas(dir: &Path) -> usize {
    fs::read_dir(dir)
        .map(|rd| {
            rd.filter_map(|e| e.ok())
                .filter(|e| e.path().is_dir())
                .count()
        })
        .unwrap_or(0)
}

/// Project all mangas belonging to `source_id`, sorted by natural title order.
fn mangas_for_source(db: &MangaDb, source_id: &str) -> Vec<MangaDto> {
    let mut mangas: Vec<MangaDto> = db
        .mangas
        .iter()
        .filter(|(_, manga)| manga.source_id == source_id)
        .map(|(id, manga)| manga.project(id.as_str()))
        .collect();
    mangas.sort_by(|a, b| natural_cmp(&a.title, &b.title));
    mangas
}

/// Reconcile a source and its mangas against a fresh disk scan: upsert the
/// source metadata (preserving user-controlled fields), drop mangas that
/// vanished from disk, and refresh display fields while keeping reading state.
fn sync_source_mangas(
    db: &mut MangaDb,
    source_id: &str,
    dir: &Path,
    scanned_at: u64,
    mangas: &[MangaDto],
) {
    let on_disk_ids: HashSet<&str> = mangas.iter().map(|m| m.id.as_str()).collect();
    let manga_count = on_disk_ids.len();
    let source_path = normalize(dir);

    if let Some(existing) = db.sources.get_mut(source_id) {
        existing.path = source_path;
        existing.scanned_at = scanned_at;
        existing.manga_count = manga_count;
    } else {
        let mut record = SourceRecord::new(
            source_path,
            resolve_source_name(dir, None),
            manga_count,
            db.next_source_order(),
        );
        record.scanned_at = scanned_at;
        db.sources.insert(source_id.to_string(), record);
    }

    db.mangas
        .retain(|id, m| m.source_id != source_id || on_disk_ids.contains(id.as_str()));

    for manga in mangas {
        let entry = db.mangas.entry(manga.id.clone()).or_default();
        entry.source_id = source_id.to_string();
        entry.title = manga.title.clone();
        entry.path = manga.path.clone();
        entry.cover_path = manga.cover_path.clone();
        entry.chapter_count = manga.chapter_count;
    }
}

/// Resolve a source's display name: the trimmed override, else the folder name.
fn resolve_source_name(dir: &Path, name: Option<String>) -> String {
    name.filter(|s| !s.trim().is_empty()).unwrap_or_else(|| {
        dir.file_name()
            .and_then(|s| s.to_str())
            .unwrap_or("Untitled")
            .to_string()
    })
}
