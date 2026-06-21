//! Chapter discovery, page loading, and read-state mutations for a manga.
//! Chapter status persists in the manga DB; CBZ page extraction is delegated
//! to `infra::archive`.

use std::collections::{HashMap, HashSet};
use std::path::Path;
use std::sync::Mutex;

use rayon::prelude::*;
use tauri::Manager;

use crate::error::{AppError, AppResult};
use crate::infra::archive;
use crate::infra::image::{has_image, images_in, subdirs_and_cbz};
use crate::infra::naming::{natural_cmp, normalize, now_epoch, path_id, title_from_path};
use crate::infra::paths;
use crate::models::{Chapter, ChapterStatus};
use crate::store::db::{self, MangaDbCache};

// ── Discovery & loading ──────────────────────────────────────────────────────

/// List a manga's chapters fresh from disk, overlaying any saved statuses.
pub(crate) fn list(app: &tauri::AppHandle, manga_path: &str) -> AppResult<Vec<Chapter>> {
    let dir = Path::new(manga_path);
    let manga_id = path_id(dir);
    let chapters_map = chapters_map_for(app, &manga_id)?;
    Ok(discover_chapters(dir, &chapters_map))
}

/// Re-scan a manga folder from disk: refresh the chapter list, prune saved
/// statuses for chapters that no longer exist, and update the cached
/// chapter/read counts in one DB write. Returns the fresh chapter list.
pub(crate) fn rescan(app: &tauri::AppHandle, manga_path: &str) -> AppResult<Vec<Chapter>> {
    let dir = Path::new(manga_path);
    let manga_id = path_id(dir);
    let chapters_map = chapters_map_for(app, &manga_id)?;
    let chapters = discover_chapters(dir, &chapters_map);

    let on_disk_ids: HashSet<&str> = chapters.iter().map(|c| c.id.as_str()).collect();
    let chapter_count = chapters.len();
    let cache = app.state::<Mutex<MangaDbCache>>();
    db::mutate(&cache, app, |db| {
        if let Some(entry) = db.mangas.get_mut(&manga_id) {
            entry.chapters.retain(|id, _| on_disk_ids.contains(id.as_str()));
            entry.chapter_count = chapter_count;
            entry.read_chapters = entry
                .chapters
                .values()
                .filter(|s| matches!(s, ChapterStatus::Read))
                .count();
        }
    })?;

    Ok(chapters)
}

/// Load a chapter's page image paths: directory images, or extracted CBZ pages.
pub(crate) fn open(
    app: &tauri::AppHandle,
    chapter_path: &str,
    file_type: &str,
) -> AppResult<Vec<String>> {
    let path = Path::new(chapter_path);

    match file_type {
        "dir" => {
            let pages: Vec<String> = images_in(path).iter().map(|p| normalize(p)).collect();
            if pages.is_empty() {
                return Err(AppError::Invalid("No images found in chapter".to_string()));
            }
            Ok(pages)
        }

        "cbz" => {
            let extract_dir = paths::pages_dir(app)?.join(path_id(path));
            archive::extract_pages(path, &extract_dir)
        }

        _ => Err(AppError::Invalid(format!("Unknown file_type: {}", file_type))),
    }
}

// ── Read state ───────────────────────────────────────────────────────────────

/// Save reading progress: Read once at the last page, else Ongoing at `page`.
pub(crate) fn set_progress(
    app: &tauri::AppHandle,
    manga_id: String,
    chapter_id: String,
    page: usize,
    total_pages: usize,
) -> AppResult<()> {
    let status = if page >= total_pages.saturating_sub(1) {
        ChapterStatus::Read
    } else {
        ChapterStatus::Ongoing { page }
    };
    update_chapter_status(app, manga_id, chapter_id, status)
}

/// Mark a single chapter Read or Unread.
pub(crate) fn set_chapter_read(
    app: &tauri::AppHandle,
    manga_id: String,
    chapter_id: String,
    read: bool,
) -> AppResult<()> {
    let status = if read { ChapterStatus::Read } else { ChapterStatus::Unread };
    update_chapter_status(app, manga_id, chapter_id, status)
}

/// Bulk mark every chapter of each manga Read or Unread in a single DB write.
/// For Read, chapter ids are discovered from disk (in parallel) before taking
/// the write lock; for Unread the chapter map is simply cleared.
pub(crate) fn set_mangas_read(
    app: &tauri::AppHandle,
    manga_ids: Vec<String>,
    read: bool,
) -> AppResult<()> {
    let cache = app.state::<Mutex<MangaDbCache>>();

    let chapter_ids: HashMap<String, Vec<String>> = if read {
        let paths: Vec<(String, String)> = {
            let guard = db::lock(&cache)?;
            manga_ids
                .iter()
                .filter_map(|id| guard.db.mangas.get(id).map(|m| (id.clone(), m.path.clone())))
                .collect()
        };
        paths
            .into_par_iter()
            .map(|(id, path)| (id, readable_chapter_ids(Path::new(&path))))
            .collect()
    } else {
        HashMap::new()
    };

    let now = now_epoch();
    db::mutate(&cache, app, |db| {
        for id in &manga_ids {
            let Some(entry) = db.mangas.get_mut(id) else { continue };
            entry.chapters.clear();
            if read {
                if let Some(ids) = chapter_ids.get(id) {
                    for cid in ids {
                        entry.chapters.insert(cid.clone(), ChapterStatus::Read);
                    }
                }
                entry.read_chapters = entry.chapters.len();
                entry.last_read_at = now;
            } else {
                entry.read_chapters = 0;
            }
        }
    })
}

/// Mark a specific set of chapters within one manga Read or Unread in a single
/// DB write. Marking Unread removes the status entry (Unread is the implicit
/// default), keeping the persisted chapter map lean.
pub(crate) fn set_chapters_read(
    app: &tauri::AppHandle,
    manga_id: String,
    chapter_ids: Vec<String>,
    read: bool,
) -> AppResult<()> {
    let cache = app.state::<Mutex<MangaDbCache>>();
    db::mutate(&cache, app, |db| {
        let entry = db.mangas.entry(manga_id).or_default();
        for cid in &chapter_ids {
            if read {
                entry.chapters.insert(cid.clone(), ChapterStatus::Read);
            } else {
                entry.chapters.remove(cid);
            }
        }
        entry.read_chapters = entry
            .chapters
            .values()
            .filter(|s| matches!(s, ChapterStatus::Read))
            .count();
        if read {
            entry.last_read_at = now_epoch();
        }
    })
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/// Discover a manga's chapters fresh from disk (image subdirs + CBZs),
/// overlaying any saved statuses, sorted in natural title order.
fn discover_chapters(dir: &Path, chapters_map: &HashMap<String, ChapterStatus>) -> Vec<Chapter> {
    let (sub_dirs, cbz_files) = subdirs_and_cbz(dir);

    let dir_chapters = sub_dirs.par_iter().filter_map(|p| {
        let page_count = images_in(p).len();
        if page_count == 0 {
            return None;
        }
        let id = path_id(p);
        let status = chapters_map.get(&id).cloned().unwrap_or(ChapterStatus::Unread);
        Some(Chapter {
            id,
            title: title_from_path(p),
            path: normalize(p),
            file_type: "dir".to_string(),
            page_count,
            status,
        })
    });

    let cbz_chapters = cbz_files.par_iter().map(|p| {
        let id = path_id(p);
        let status = chapters_map.get(&id).cloned().unwrap_or(ChapterStatus::Unread);
        let page_count = archive::count_images(p);
        Chapter {
            id,
            title: title_from_path(p),
            path: normalize(p),
            file_type: "cbz".to_string(),
            page_count,
            status,
        }
    });

    let mut chapters: Vec<Chapter> = dir_chapters.chain(cbz_chapters).collect();
    chapters.sort_by(|a, b| natural_cmp(&a.title, &b.title));
    chapters
}

/// Read a manga's saved chapter-status map out of the cache (no disk I/O).
fn chapters_map_for(
    app: &tauri::AppHandle,
    manga_id: &str,
) -> AppResult<HashMap<String, ChapterStatus>> {
    let cache = app.state::<Mutex<MangaDbCache>>();
    let guard = db::lock(&cache)?;
    Ok(guard
        .db
        .mangas
        .get(manga_id)
        .map(|manga| manga.chapters.clone())
        .unwrap_or_default())
}

/// Discover readable chapter ids for a manga on disk (image dirs + CBZs),
/// matching the discovery `list` uses.
fn readable_chapter_ids(manga_path: &Path) -> Vec<String> {
    let (sub_dirs, cbz_files) = subdirs_and_cbz(manga_path);
    // Check chapters in parallel so a single manga with many chapters still
    // scans fast (nested under the per-manga par_iter at the call site).
    let mut ids: Vec<String> = sub_dirs
        .par_iter()
        .filter(|p| has_image(p))
        .map(|p| path_id(p))
        .collect();
    ids.extend(cbz_files.iter().map(|p| path_id(p)));
    ids
}

fn update_chapter_status(
    app: &tauri::AppHandle,
    manga_id: String,
    chapter_id: String,
    status: ChapterStatus,
) -> AppResult<()> {
    let cache = app.state::<Mutex<MangaDbCache>>();
    db::mutate(&cache, app, |db| {
        let entry = db.mangas.entry(manga_id).or_default();
        entry.chapters.insert(chapter_id, status);
        entry.read_chapters = entry
            .chapters
            .values()
            .filter(|s| matches!(s, ChapterStatus::Read))
            .count();
        entry.last_read_at = now_epoch();
    })
}
