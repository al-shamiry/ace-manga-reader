use std::collections::HashMap;
use std::fs;
use std::io::Read;
use std::path::Path;

use tauri::Manager;
use zip::ZipArchive;

use crate::utils::{cbz_files_in, images_in, is_image, normalize, path_id, subdirs, title_from_path};
use crate::models::chapter::{Chapter, ChapterStatus};

// ── Progress helpers ──────────────────────────────────────────────────────────

fn progress_file(app_data_dir: &std::path::Path) -> std::path::PathBuf {
    app_data_dir.join("progress.json")
}

fn load_progress_map(app_data_dir: &std::path::Path) -> HashMap<String, ChapterStatus> {
    fs::read(progress_file(app_data_dir))
        .ok()
        .and_then(|b| serde_json::from_slice(&b).ok())
        .unwrap_or_default()
}

fn load_status(app_data_dir: &std::path::Path, chapter_id: &str) -> ChapterStatus {
    load_progress_map(app_data_dir)
        .remove(chapter_id)
        .unwrap_or(ChapterStatus::Unread)
}

fn save_status(
    app_data_dir: &std::path::Path,
    chapter_id: &str,
    status: &ChapterStatus,
) -> Result<(), String> {
    let mut map = load_progress_map(app_data_dir);
    map.insert(chapter_id.to_string(), status.clone());
    let json = serde_json::to_vec(&map).map_err(|e| e.to_string())?;
    fs::write(progress_file(app_data_dir), json).map_err(|e| e.to_string())
}

// ── Commands ──────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_chapters(
    manga_path: String,
    file_type: String,
    app_handle: tauri::AppHandle,
) -> Result<Vec<Chapter>, String> {
    let dir = Path::new(&manga_path);
    let app_data_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;

    let mut chapters: Vec<Chapter> = match file_type.as_str() {
        "dir" => subdirs(dir)
            .into_iter()
            .map(|p| {
                let id = path_id(&p);
                let status = load_status(&app_data_dir, &id);
                let page_count = images_in(&p).len();
                Chapter {
                    id,
                    title: title_from_path(&p),
                    path: normalize(&p),
                    file_type: "dir".to_string(),
                    page_count,
                    status,
                }
            })
            .collect(),

        "cbz" => cbz_files_in(dir)
            .into_iter()
            .map(|p| {
                let id = path_id(&p);
                let status = load_status(&app_data_dir, &id);
                let page_count = fs::File::open(&p)
                    .ok()
                    .and_then(|f| ZipArchive::new(f).ok())
                    .map(|mut a| {
                        (0..a.len())
                            .filter(|&i| {
                                a.by_index(i)
                                    .map(|e| is_image(Path::new(e.name())))
                                    .unwrap_or(false)
                            })
                            .count()
                    })
                    .unwrap_or(0);
                Chapter {
                    id,
                    title: title_from_path(&p),
                    path: normalize(&p),
                    file_type: "cbz".to_string(),
                    page_count,
                    status,
                }
            })
            .collect(),

        _ => return Err(format!("Unknown file_type: {}", file_type)),
    };

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

        "cbz" => {
            let app_data_dir =
                app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
            let chapter_id = path_id(path);
            let extract_dir = app_data_dir.join("pages").join(&chapter_id);

            // Return cached extraction if it already exists
            if extract_dir.is_dir() {
                let pages: Vec<String> =
                    images_in(&extract_dir).iter().map(|p| normalize(p)).collect();
                if !pages.is_empty() {
                    return Ok(pages);
                }
            }

            // Extract all images from the CBZ
            fs::create_dir_all(&extract_dir).map_err(|e| e.to_string())?;

            let file = fs::File::open(path).map_err(|e| e.to_string())?;
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

        _ => Err(format!("Unknown file_type: {}", file_type)),
    }
}

#[tauri::command]
pub fn set_chapter_progress(
    chapter_id: String,
    page: usize,
    total_pages: usize,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let app_data_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let status = if page >= total_pages.saturating_sub(1) {
        ChapterStatus::Read
    } else {
        ChapterStatus::Ongoing { page }
    };
    save_status(&app_data_dir, &chapter_id, &status)
}

#[tauri::command]
pub fn mark_chapter_read(
    chapter_id: String,
    read: bool,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let app_data_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let status = if read {
        ChapterStatus::Read
    } else {
        ChapterStatus::Unread
    };
    save_status(&app_data_dir, &chapter_id, &status)
}
