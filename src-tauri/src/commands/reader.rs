use std::collections::{HashMap, HashSet};
use std::fs;
use std::io::Read;
use std::path::Path;
use std::sync::Mutex;

use rayon::prelude::*;
use tauri::Manager;
use zip::ZipArchive;

use crate::commands::manga_db::{self, MangaDbCache};
use crate::commands::settings::{load_config, ReaderSettings};
use crate::error::{AppError, AppResult};
use crate::models::{Chapter, ChapterStatus};
use crate::paths;
use crate::utils::{
    has_image, images_in, is_image, natural_cmp, normalize, now_epoch, path_id, subdirs_and_cbz,
    title_from_path, write_atomic_json,
};

// ── Per-manga reader settings (settings/{manga_id}.json) ─────────────────────

fn load_settings(path: &Path) -> Option<ReaderSettings> {
    fs::read_to_string(path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
}

#[tauri::command]
pub fn get_manga_reader_settings(
    app: tauri::AppHandle,
    manga_id: String,
) -> AppResult<ReaderSettings> {
    let defaults = load_config(&app)?.reader_settings;
    let settings = match load_settings(&paths::manga_settings_file(&app, &manga_id)?) {
        Some(m) => ReaderSettings {
            fit_mode: m.fit_mode.or(defaults.fit_mode),
            reading_mode: m.reading_mode.or(defaults.reading_mode),
            webtoon_padding: m.webtoon_padding.or(defaults.webtoon_padding),
        },
        None => defaults,
    };
    Ok(settings)
}

/// Merges a patch into a manga's saved reader settings so partial updates
/// don't clobber other fields. Missing file → start from all-None.
#[tauri::command]
pub fn set_manga_reader_settings(
    app: tauri::AppHandle,
    settings: ReaderSettings,
    manga_id: String,
) -> AppResult<()> {
    let settings = settings.clamped();
    let path = paths::manga_settings_file(&app, &manga_id)?;
    let existing = load_settings(&path).unwrap_or(ReaderSettings {
        fit_mode: None,
        reading_mode: None,
        webtoon_padding: None,
    });
    let merged = ReaderSettings {
        fit_mode: settings.fit_mode.or(existing.fit_mode),
        reading_mode: settings.reading_mode.or(existing.reading_mode),
        webtoon_padding: settings.webtoon_padding.or(existing.webtoon_padding),
    };
    write_atomic_json(&path, &merged)
}

// ── Helpers ──────────────────────────────────────────────────────────────────

fn count_cbz_images(path: &Path) -> usize {
    fs::File::open(path)
        .ok()
        .and_then(|f| ZipArchive::new(f).ok())
        .map(|mut archive| {
            (0..archive.len())
                .filter(|&i| {
                    archive
                        .by_index(i)
                        .map(|e| is_image(Path::new(e.name())))
                        .unwrap_or(false)
                })
                .count()
        })
        .unwrap_or(0)
}

fn extract_cbz_pages(cbz_path: &Path, app: &tauri::AppHandle) -> AppResult<Vec<String>> {
    let chapter_id = path_id(cbz_path);
    let extract_dir = paths::pages_dir(app)?.join(&chapter_id);

    // Return cached extraction if it already exists
    if extract_dir.is_dir() {
        let pages: Vec<String> = images_in(&extract_dir).iter().map(|p| normalize(p)).collect();
        if !pages.is_empty() {
            return Ok(pages);
        }
    }

    fs::create_dir_all(&extract_dir)?;

    let file = fs::File::open(cbz_path)?;
    let mut archive = ZipArchive::new(file)?;

    let mut image_names: Vec<String> = (0..archive.len())
        .filter_map(|i| {
            archive.by_index(i).ok().and_then(|e| {
                let name = e.name().to_string();
                if is_image(Path::new(&name)) { Some(name) } else { None }
            })
        })
        .collect();
    image_names.sort();

    if image_names.is_empty() {
        return Err(AppError::Invalid("No images found in CBZ".to_string()));
    }

    let mut extracted_paths = Vec::new();
    for (i, name) in image_names.iter().enumerate() {
        let ext = Path::new(name)
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("jpg");
        let dest = extract_dir.join(format!("{:05}.{}", i, ext));

        if !dest.exists() {
            let mut entry = archive.by_name(name)?;
            let mut bytes = Vec::new();
            entry.read_to_end(&mut bytes)?;
            fs::write(&dest, &bytes)?;
        }

        extracted_paths.push(normalize(&dest));
    }

    Ok(extracted_paths)
}

fn update_chapter_status(
    cache: &Mutex<MangaDbCache>,
    app: &tauri::AppHandle,
    manga_id: String,
    chapter_id: String,
    status: ChapterStatus,
) -> AppResult<()> {
    manga_db::mutate(cache, app, |db| {
        let entry = db.mangas.entry(manga_id).or_default();
        entry.chapters.insert(chapter_id, status);
        entry.read_chapters = entry.chapters.values()
            .filter(|s| matches!(s, ChapterStatus::Read))
            .count();
        entry.last_read_at = now_epoch();
    })
}

// ── Commands ──────────────────────────────────────────────────────────────────

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
        let page_count = count_cbz_images(p);
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

/// Read a manga's saved chapter-status map out of the cache (no I/O).
fn chapters_map_for(
    cache: &Mutex<MangaDbCache>,
    manga_id: &str,
) -> AppResult<HashMap<String, ChapterStatus>> {
    let guard = manga_db::lock(cache)?;
    Ok(guard
        .db
        .mangas
        .get(manga_id)
        .map(|manga| manga.chapters.clone())
        .unwrap_or_default())
}

#[tauri::command]
pub fn get_chapters(manga_path: String, app: tauri::AppHandle) -> AppResult<Vec<Chapter>> {
    let dir = Path::new(&manga_path);
    let manga_id = path_id(dir);

    let cache = app.state::<Mutex<MangaDbCache>>();
    let chapters_map = chapters_map_for(&cache, &manga_id)?;

    Ok(discover_chapters(dir, &chapters_map))
}

/// Re-scan a single manga folder from disk: refresh the chapter list, prune
/// saved statuses for chapters that no longer exist, and update the cached
/// chapter/read counts in one DB write. Returns the fresh chapter list.
#[tauri::command]
pub fn rescan_manga(manga_path: String, app: tauri::AppHandle) -> AppResult<Vec<Chapter>> {
    let dir = Path::new(&manga_path);
    let manga_id = path_id(dir);
    let cache = app.state::<Mutex<MangaDbCache>>();

    let chapters_map = chapters_map_for(&cache, &manga_id)?;
    let chapters = discover_chapters(dir, &chapters_map);

    let on_disk_ids: HashSet<&str> = chapters.iter().map(|c| c.id.as_str()).collect();
    let chapter_count = chapters.len();
    manga_db::mutate(&cache, &app, |db| {
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

#[tauri::command]
pub fn open_chapter(
    chapter_path: String,
    file_type: String,
    app: tauri::AppHandle,
) -> AppResult<Vec<String>> {
    let path = Path::new(&chapter_path);

    match file_type.as_str() {
        "dir" => {
            let pages: Vec<String> = images_in(path).iter().map(|p| normalize(p)).collect();
            if pages.is_empty() {
                return Err(AppError::Invalid("No images found in chapter".to_string()));
            }
            Ok(pages)
        }

        "cbz" => extract_cbz_pages(path, &app),

        _ => Err(AppError::Invalid(format!("Unknown file_type: {}", file_type))),
    }
}

#[tauri::command]
pub fn set_chapter_progress(
    manga_id: String,
    chapter_id: String,
    page: usize,
    total_pages: usize,
    app: tauri::AppHandle,
) -> AppResult<()> {
    let status = if page >= total_pages.saturating_sub(1) {
        ChapterStatus::Read
    } else {
        ChapterStatus::Ongoing { page }
    };
    let cache = app.state::<Mutex<MangaDbCache>>();
    update_chapter_status(&cache, &app, manga_id, chapter_id, status)
}

#[tauri::command]
pub fn mark_chapter_read(
    manga_id: String,
    chapter_id: String,
    read: bool,
    app: tauri::AppHandle,
) -> AppResult<()> {
    let status = if read { ChapterStatus::Read } else { ChapterStatus::Unread };
    let cache = app.state::<Mutex<MangaDbCache>>();
    update_chapter_status(&cache, &app, manga_id, chapter_id, status)
}

/// Discover readable chapter ids for a manga on disk (image dirs + CBZs),
/// matching the discovery `get_chapters` uses.
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

/// Bulk mark every chapter of each manga Read or Unread in a single DB write.
/// For Read, chapter ids are discovered from disk (in parallel) before taking
/// the write lock; for Unread the chapter map is simply cleared.
#[tauri::command]
pub fn mark_mangas_read(
    manga_ids: Vec<String>,
    read: bool,
    app: tauri::AppHandle,
) -> AppResult<()> {
    let cache = app.state::<Mutex<MangaDbCache>>();

    let chapter_ids: HashMap<String, Vec<String>> = if read {
        let paths: Vec<(String, String)> = {
            let guard = manga_db::lock(&cache)?;
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
    manga_db::mutate(&cache, &app, |db| {
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
#[tauri::command]
pub fn mark_chapters_read(
    manga_id: String,
    chapter_ids: Vec<String>,
    read: bool,
    app: tauri::AppHandle,
) -> AppResult<()> {
    let cache = app.state::<Mutex<MangaDbCache>>();
    manga_db::mutate(&cache, &app, |db| {
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
