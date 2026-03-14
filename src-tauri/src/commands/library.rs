use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};

use sha2::{Digest, Sha256};
use zip::ZipArchive;

use tauri::Manager;

use crate::models::comic::Comic;

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

/// A manga folder = a folder whose subdirectories contain image files (i.e. it has issues).
fn is_manga_dir(path: &Path) -> bool {
    subdirs(path)
        .iter()
        .any(|sub| !images_in(sub).is_empty())
}

/// Find the cover for a manga folder:
///   1. cover.png / cover.jpg / cover.webp directly in the manga folder
///   2. First image of the first issue (alphabetically)
fn find_manga_cover(manga_path: &Path) -> Option<String> {
    // 1. Explicit cover file
    for name in &["cover.png", "cover.jpg", "cover.jpeg", "cover.webp"] {
        let candidate = manga_path.join(name);
        if candidate.is_file() {
            return Some(normalize(&candidate));
        }
    }

    // 2. First image from first issue
    let first_issue = subdirs(manga_path).into_iter().next()?;
    let first_image = images_in(&first_issue).into_iter().next()?;
    Some(normalize(&first_image))
}

/// Count total pages across all issue subfolders of a manga.
fn count_manga_pages(manga_path: &Path) -> usize {
    subdirs(manga_path)
        .iter()
        .map(|issue| images_in(issue).len())
        .sum()
}

/// Scan a manga folder and return a Comic.
fn scan_manga_dir(path: &Path) -> Result<Comic, String> {
    let cover_path = find_manga_cover(path)
        .ok_or_else(|| "No cover or images found".to_string())?;
    let page_count = count_manga_pages(path);
    if page_count == 0 {
        return Err("No pages found".to_string());
    }
    Ok(Comic {
        id: path_id(path),
        title: title_from_path(path),
        path: normalize(path),
        cover_path,
        page_count,
        file_type: "manga".to_string(),
    })
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
                match scan_manga_dir(&entry) {
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

#[tauri::command]
pub fn scan_directory(
    path: String,
    app_handle: tauri::AppHandle,
) -> Result<Vec<Comic>, String> {
    let dir = Path::new(&path);
    if !dir.is_dir() {
        return Err(format!("'{}' is not a directory", path));
    }

    let cache_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e: tauri::Error| e.to_string())?
        .join("covers");
    fs::create_dir_all(&cache_dir).map_err(|e| e.to_string())?;

    let mut comics = collect_comics(dir, 1, &cache_dir);
    comics.sort_by(|a, b| a.title.to_lowercase().cmp(&b.title.to_lowercase()));

    Ok(comics)
}
