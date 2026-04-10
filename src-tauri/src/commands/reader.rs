use std::collections::HashMap;
use std::fs;
use std::io::Read;
use std::path::Path;
use std::sync::Mutex;

use rayon::prelude::*;
use tauri::Manager;
use zip::ZipArchive;

use crate::commands::manga_db::{self, MangaDbCache};
use crate::models::chapter::{Chapter, ChapterStatus};
use crate::utils::{images_in, is_image, now_epoch, normalize, path_id, subdirs_and_cbz, title_from_path};

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

fn extract_cbz_pages(cbz_path: &Path, app_handle: &tauri::AppHandle) -> Result<Vec<String>, String> {
    let app_data_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let chapter_id = path_id(cbz_path);
    let extract_dir = app_data_dir.join("cache").join("pages").join(&chapter_id);

    // Return cached extraction if it already exists
    if extract_dir.is_dir() {
        let pages: Vec<String> = images_in(&extract_dir).iter().map(|p| normalize(p)).collect();
        if !pages.is_empty() {
            return Ok(pages);
        }
    }

    fs::create_dir_all(&extract_dir).map_err(|e| e.to_string())?;

    let file = fs::File::open(cbz_path).map_err(|e| e.to_string())?;
    let mut archive = ZipArchive::new(file).map_err(|e| e.to_string())?;

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
        return Err("No images found in CBZ".to_string());
    }

    let mut extracted_paths = Vec::new();
    for (i, name) in image_names.iter().enumerate() {
        let ext = Path::new(name)
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("jpg");
        let dest = extract_dir.join(format!("{:05}.{}", i, ext));

        if !dest.exists() {
            let mut entry = archive.by_name(name).map_err(|e| e.to_string())?;
            let mut bytes = Vec::new();
            entry.read_to_end(&mut bytes).map_err(|e| e.to_string())?;
            fs::write(&dest, &bytes).map_err(|e| e.to_string())?;
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
) -> Result<(), String> {
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

#[tauri::command]
pub fn get_chapters(
    manga_path: String,
    app_handle: tauri::AppHandle,
) -> Result<Vec<Chapter>, String> {
    let dir = Path::new(&manga_path);
    let manga_id = path_id(dir);

    // Pull the chapters map out of the cache (no I/O)
    let cache = app_handle.state::<Mutex<MangaDbCache>>();
    let chapters_map: HashMap<String, ChapterStatus> = {
        let guard = cache.lock().map_err(|e| e.to_string())?;
        guard.db.mangas.get(&manga_id)
            .map(|m| m.chapters.clone())
            .unwrap_or_default()
    };

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

    let cbz_chapters = cbz_files.par_iter().filter_map(|p| {
        let id = path_id(p);
        let status = chapters_map.get(&id).cloned().unwrap_or(ChapterStatus::Unread);
        let page_count = count_cbz_images(p);
        Some(Chapter {
            id,
            title: title_from_path(p),
            path: normalize(p),
            file_type: "cbz".to_string(),
            page_count,
            status,
        })
    });

    let mut chapters: Vec<Chapter> = dir_chapters.chain(cbz_chapters).collect();
    chapters.sort_by(|a, b| crate::utils::natural_cmp(&a.title, &b.title));
    Ok(chapters)
}

#[tauri::command]
pub fn open_chapter(
    chapter_path: String,
    file_type: String,
    app_handle: tauri::AppHandle,
) -> Result<Vec<String>, String> {
    let path = Path::new(&chapter_path);

    match file_type.as_str() {
        "dir" => {
            let pages: Vec<String> = images_in(path).iter().map(|p| normalize(p)).collect();
            if pages.is_empty() {
                return Err("No images found in chapter".to_string());
            }
            Ok(pages)
        }

        "cbz" => extract_cbz_pages(path, &app_handle),

        _ => Err(format!("Unknown file_type: {}", file_type)),
    }
}

#[tauri::command]
pub fn set_chapter_progress(
    manga_id: String,
    chapter_id: String,
    page: usize,
    total_pages: usize,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let status = if page >= total_pages.saturating_sub(1) {
        ChapterStatus::Read
    } else {
        ChapterStatus::Ongoing { page }
    };
    let cache = app_handle.state::<Mutex<MangaDbCache>>();
    update_chapter_status(&cache, &app_handle, manga_id, chapter_id, status)
}

#[tauri::command]
pub fn mark_chapter_read(
    manga_id: String,
    chapter_id: String,
    read: bool,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let status = if read { ChapterStatus::Read } else { ChapterStatus::Unread };
    let cache = app_handle.state::<Mutex<MangaDbCache>>();
    update_chapter_status(&cache, &app_handle, manga_id, chapter_id, status)
}
