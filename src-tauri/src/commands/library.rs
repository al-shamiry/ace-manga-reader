use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};

use sha2::{Digest, Sha256};
use zip::ZipArchive;

use tauri::Manager;

use crate::models::comic::Comic;

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct Source {
    id: String,
    name: String,
    path: String,
    manga_count: usize,
}

const IMAGE_EXTENSIONS: &[&str] = &["jpg", "jpeg", "png", "webp", "gif", "avif"];

fn is_image(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .map(|e| IMAGE_EXTENSIONS.contains(&e.to_lowercase().as_str()))
        .unwrap_or(false)
}

fn path_id(path: &Path) -> String {
    let mut hasher = Sha256::new();
    hasher.update(path.to_string_lossy().as_bytes());
    hex::encode(&hasher.finalize()[..8])
}

fn title_from_path(path: &Path) -> String {
    path.file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Unknown")
        .to_string()
}

fn normalize(path: &Path) -> String {
    path.to_string_lossy().replace('\\', "/")
}

/// Returns sorted subdirectories of a path.
fn subdirs(path: &Path) -> Vec<PathBuf> {
    let mut dirs: Vec<PathBuf> = fs::read_dir(path)
        .into_iter()
        .flatten()
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .filter(|p| p.is_dir())
        .collect();
    dirs.sort();
    dirs
}

/// Returns sorted image files directly inside a directory.
fn images_in(path: &Path) -> Vec<PathBuf> {
    let mut imgs: Vec<PathBuf> = fs::read_dir(path)
        .into_iter()
        .flatten()
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .filter(|p| p.is_file() && is_image(p))
        .collect();
    imgs.sort();
    imgs
}

fn cbz_files_in(path: &Path) -> Vec<PathBuf> {
    let mut files: Vec<PathBuf> = fs::read_dir(path)
        .into_iter()
        .flatten()
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .filter(|p| {
            p.is_file()
                && p.extension()
                    .and_then(|e| e.to_str())
                    .map(|e| e.eq_ignore_ascii_case("cbz"))
                    .unwrap_or(false)
        })
        .collect();
    files.sort();
    files
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
    let page_count: usize = subdirs(path).iter().map(|issue| images_in(issue).len()).sum();
    if page_count == 0 {
        return Err("No pages found".to_string());
    }
    Ok(Comic {
        id: path_id(path),
        title: title_from_path(path),
        path: normalize(path),
        cover_path,
        page_count,
        file_type: "dir".to_string(),
    })
}

/// Scan a CBZ-based manga (issues are CBZ files inside the folder).
fn scan_cbz_manga(path: &Path, cache_dir: &Path) -> Result<Comic, String> {
    let cbz_files = cbz_files_in(path);
    if cbz_files.is_empty() {
        return Err("No CBZ files found".to_string());
    }

    // Cover from first CBZ
    let first_cbz = &cbz_files[0];
    let file = fs::File::open(first_cbz).map_err(|e| e.to_string())?;
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
        return Err("No images in first CBZ".to_string());
    }

    let cover_name = &image_names[0];
    let id = path_id(path);
    let ext = Path::new(cover_name).extension().and_then(|e| e.to_str()).unwrap_or("jpg");
    let cover_path = cache_dir.join(format!("{}.{}", id, ext));

    if !cover_path.exists() {
        let mut entry = archive.by_name(cover_name).map_err(|e| e.to_string())?;
        let mut bytes = Vec::new();
        entry.read_to_end(&mut bytes).map_err(|e| e.to_string())?;
        fs::write(&cover_path, &bytes).map_err(|e| e.to_string())?;
    }

    // Sum pages across all CBZ files
    let page_count: usize = cbz_files.iter().map(|cbz| {
        fs::File::open(cbz)
            .ok()
            .and_then(|f| ZipArchive::new(f).ok())
            .map(|mut a| {
                (0..a.len())
                    .filter(|&i| a.by_index(i).map(|e| is_image(Path::new(e.name()))).unwrap_or(false))
                    .count()
            })
            .unwrap_or(0)
    }).sum();

    Ok(Comic {
        id,
        title: title_from_path(path),
        path: normalize(path),
        cover_path: normalize(&cover_path),
        page_count,
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

/// Scan a CBZ file: count image entries and extract the cover to cache_dir.
fn scan_cbz(path: &Path, cache_dir: &Path) -> Result<Comic, String> {
    let file = fs::File::open(path).map_err(|e| e.to_string())?;
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
        return Err("No images found in CBZ".to_string());
    }

    let cover_name = &image_names[0];
    let id = path_id(path);
    let ext = Path::new(cover_name)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("jpg");
    let cover_path = cache_dir.join(format!("{}.{}", id, ext));

    if !cover_path.exists() {
        let mut entry = archive.by_name(cover_name).map_err(|e| e.to_string())?;
        let mut bytes = Vec::new();
        entry.read_to_end(&mut bytes).map_err(|e| e.to_string())?;
        fs::write(&cover_path, &bytes).map_err(|e| e.to_string())?;
    }

    Ok(Comic {
        id,
        title: title_from_path(path),
        path: normalize(path),
        cover_path: normalize(&cover_path),
        page_count: image_names.len(),
        file_type: "cbz".to_string(),
    })
}

/// Collect all manga/CBZ comics found within `dir`, searching up to `depth` levels deep.
/// depth=0: look at direct children of dir
/// depth=1: also look inside subdirs of dir (handles source → manga nesting)
fn collect_comics(dir: &Path, depth: u32, cache_dir: &Path) -> Vec<Comic> {
    let mut comics = Vec::new();

    let entries: Vec<PathBuf> = fs::read_dir(dir)
        .into_iter()
        .flatten()
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .collect();

    for entry in entries {
        let ext = entry.extension().and_then(|e| e.to_str()).map(|e| e.to_lowercase());

        if ext.as_deref() == Some("cbz") && entry.is_file() {
            match scan_cbz(&entry, cache_dir) {
                Ok(comic) => comics.push(comic),
                Err(e) => eprintln!("Skipping CBZ {:?}: {}", entry, e),
            }
        } else if entry.is_dir() {
            if is_manga_dir(&entry) {
                match scan_manga_dir(&entry, cache_dir) {
                    Ok(comic) => comics.push(comic),
                    Err(e) => eprintln!("Skipping manga {:?}: {}", entry, e),
                }
            } else if depth > 0 {
                // Could be a source folder — recurse one level
                comics.extend(collect_comics(&entry, depth - 1, cache_dir));
            }
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
    sources.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
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

    // Return cached result if available and refresh not requested
    if !force_refresh {
        if let Some(cached) = load_scan_cache(&cache_file) {
            return Ok(cached);
        }
    }

    let covers_dir = app_data_dir.join("covers");
    fs::create_dir_all(&covers_dir).map_err(|e| e.to_string())?;

    let mut comics = collect_comics(dir, 1, &covers_dir);
    comics.sort_by(|a, b| a.title.to_lowercase().cmp(&b.title.to_lowercase()));

    save_scan_cache(&cache_file, &comics);
    let _ = fs::write(last_dir_path(&app_data_dir), path.as_bytes());

    Ok(comics)
}
