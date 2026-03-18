use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};

use tauri::Manager;
use zip::ZipArchive;

use crate::models::comic::Comic;
use crate::utils::{cbz_files_in, images_in, is_image, natural_cmp, normalize, path_id, subdirs, title_from_path};

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct Source {
    id: String,
    name: String,
    path: String,
    manga_count: usize,
}

/// A manga folder = a folder whose children are image-containing subdirs OR CBZ files.
fn is_manga_dir(path: &Path) -> bool {
    !cbz_files_in(path).is_empty()
        || subdirs(path).iter().any(|sub| !images_in(sub).is_empty())
}

/// Find the cover for a folder-based manga:
///   1. cover.png / cover.jpg / cover.webp directly in the manga folder
///   2. First image of the first issue (alphabetically)
fn find_folder_manga_cover(manga_path: &Path) -> Option<String> {
    for name in &["cover.png", "cover.jpg", "cover.jpeg", "cover.webp"] {
        let candidate = manga_path.join(name);
        if candidate.is_file() {
            return Some(normalize(&candidate));
        }
    }
    let first_issue = subdirs(manga_path).into_iter().next()?;
    let first_image = images_in(&first_issue).into_iter().next()?;
    Some(normalize(&first_image))
}

/// Scan a folder-based manga (issues are subdirs of images).
fn scan_folder_manga(path: &Path) -> Result<Comic, String> {
    let cover_path = find_folder_manga_cover(path)
        .ok_or_else(|| "No cover or images found".to_string())?;
    let chapter_count = subdirs(path).len();
    Ok(Comic {
        id: path_id(path),
        title: title_from_path(path),
        path: normalize(path),
        cover_path,
        chapter_count,
        file_type: "dir".to_string(),
    })
}

/// Extract the cover image from a CBZ file into `cache_dir`, returning the cached path.
fn extract_cbz_cover(cbz_path: &Path, cover_id: &str, cache_dir: &Path) -> Result<String, String> {
    let file = fs::File::open(cbz_path).map_err(|e| e.to_string())?;
    let mut archive = ZipArchive::new(file).map_err(|e| e.to_string())?;

    let mut image_names: Vec<String> = (0..archive.len())
        .filter_map(|i| {
            archive.by_index(i).ok().and_then(|entry| {
                let name = entry.name().to_string();
                if is_image(Path::new(&name)) { Some(name) } else { None }
            })
        })
        .collect();
    image_names.sort();

    if image_names.is_empty() {
        return Err("No images in CBZ".to_string());
    }

    let cover_name = &image_names[0];
    let ext = Path::new(cover_name).extension().and_then(|e| e.to_str()).unwrap_or("jpg");
    let cover_path = cache_dir.join(format!("{}.{}", cover_id, ext));

    if !cover_path.exists() {
        let mut entry = archive.by_name(cover_name).map_err(|e| e.to_string())?;
        let mut bytes = Vec::new();
        entry.read_to_end(&mut bytes).map_err(|e| e.to_string())?;
        fs::write(&cover_path, &bytes).map_err(|e| e.to_string())?;
    }

    Ok(normalize(&cover_path))
}

/// Scan a CBZ-based manga (issues are CBZ files inside the folder).
fn scan_cbz_manga(path: &Path, cache_dir: &Path) -> Result<Comic, String> {
    let cbz_files = cbz_files_in(path);
    if cbz_files.is_empty() {
        return Err("No CBZ files found".to_string());
    }

    let id = path_id(path);
    let cover_path = extract_cbz_cover(&cbz_files[0], &id, cache_dir)?;

    Ok(Comic {
        id,
        title: title_from_path(path),
        path: normalize(path),
        cover_path,
        chapter_count: cbz_files.len(),
        file_type: "cbz".to_string(),
    })
}

/// Scan a manga folder — dispatches to folder or CBZ variant.
fn scan_manga_dir(path: &Path, cache_dir: &Path) -> Result<Comic, String> {
    if !cbz_files_in(path).is_empty() {
        scan_cbz_manga(path, cache_dir)
    } else {
        scan_folder_manga(path)
    }
}

/// Collect all manga comics found within `dir`, searching up to `depth` levels deep.
fn collect_comics(dir: &Path, depth: u32, cache_dir: &Path) -> Vec<Comic> {
    let mut comics = Vec::new();

    let entries: Vec<PathBuf> = match fs::read_dir(dir) {
        Ok(rd) => rd.filter_map(|e| e.ok()).map(|e| e.path()).filter(|p| p.is_dir()).collect(),
        Err(e) => {
            eprintln!("Cannot read {:?}: {}", dir, e);
            return comics;
        }
    };

    for entry in entries {
        if is_manga_dir(&entry) {
            match scan_manga_dir(&entry, cache_dir) {
                Ok(comic) => comics.push(comic),
                Err(e) => eprintln!("Skipping manga {:?}: {}", entry, e),
            }
        } else if depth > 0 {
            comics.extend(collect_comics(&entry, depth - 1, cache_dir));
        }
    }

    comics
}

fn last_dir_path(app_data_dir: &Path) -> PathBuf {
    app_data_dir.join("last_directory.txt")
}

fn root_dir_path(app_data_dir: &Path) -> PathBuf {
    app_data_dir.join("root_directory.txt")
}

#[tauri::command]
pub fn get_last_directory(app_handle: tauri::AppHandle) -> Option<String> {
    let app_data_dir = app_handle.path().app_data_dir().ok()?;
    let content = fs::read_to_string(last_dir_path(&app_data_dir)).ok()?;
    let path = content.trim().to_string();
    if path.is_empty() { None } else { Some(path) }
}

#[tauri::command]
pub fn get_root_directory(app_handle: tauri::AppHandle) -> Option<String> {
    let app_data_dir = app_handle.path().app_data_dir().ok()?;
    let content = fs::read_to_string(root_dir_path(&app_data_dir)).ok()?;
    let path = content.trim().to_string();
    if path.is_empty() { None } else { Some(path) }
}

#[tauri::command]
pub fn set_root_directory(path: String, app_handle: tauri::AppHandle) -> Result<(), String> {
    let app_data_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&app_data_dir).map_err(|e| e.to_string())?;
    fs::write(root_dir_path(&app_data_dir), path.as_bytes()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_sources(path: String) -> Result<Vec<Source>, String> {
    let dir = Path::new(&path);
    if !dir.is_dir() {
        return Err(format!("'{}' is not a directory", path));
    }
    let mut sources: Vec<Source> = fs::read_dir(dir)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .filter(|p| p.is_dir())
        .map(|p| {
            let manga_count = fs::read_dir(&p)
                .map(|rd| rd.filter_map(|e| e.ok()).filter(|e| e.path().is_dir()).count())
                .unwrap_or(0);
            Source {
                id: path_id(&p),
                name: p.file_name().unwrap_or_default().to_string_lossy().to_string(),
                path: normalize(&p),
                manga_count,
            }
        })
        .collect();
    sources.sort_by(|a, b| natural_cmp(&a.name, &b.name));
    Ok(sources)
}

fn scan_cache_path(app_data_dir: &Path, scan_path: &Path) -> PathBuf {
    let id = path_id(scan_path);
    app_data_dir.join("scan_cache").join(format!("{}.json", id))
}

fn load_scan_cache(cache_file: &Path) -> Option<Vec<Comic>> {
    let bytes = fs::read(cache_file).ok()?;
    serde_json::from_slice(&bytes).ok()
}

fn save_scan_cache(cache_file: &Path, comics: &[Comic]) {
    if let Some(parent) = cache_file.parent() {
        let _ = fs::create_dir_all(parent);
    }
    if let Ok(json) = serde_json::to_vec_pretty(comics) {
        let _ = fs::write(cache_file, json);
    }
}

#[tauri::command]
pub fn scan_directory(
    path: String,
    force_refresh: bool,
    app_handle: tauri::AppHandle,
) -> Result<Vec<Comic>, String> {
    let dir = Path::new(&path);
    if !dir.is_dir() {
        return Err(format!("'{}' is not a directory", path));
    }

    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e: tauri::Error| e.to_string())?;

    let cache_file = scan_cache_path(&app_data_dir, dir);

    if !force_refresh {
        if let Some(cached) = load_scan_cache(&cache_file) {
            return Ok(cached);
        }
    }

    let covers_dir = app_data_dir.join("covers");
    fs::create_dir_all(&covers_dir).map_err(|e| e.to_string())?;

    let mut comics = collect_comics(dir, 1, &covers_dir);
    comics.sort_by(|a, b| natural_cmp(&a.title, &b.title));

    save_scan_cache(&cache_file, &comics);
    let _ = fs::write(last_dir_path(&app_data_dir), path.as_bytes());

    Ok(comics)
}
