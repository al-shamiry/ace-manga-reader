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

/// Scans a CBZ file: counts image entries and extracts the first image to cache_dir.
/// Returns (page_count, cover_path).
fn scan_cbz(path: &Path, cache_dir: &Path) -> Result<(usize, String), String> {
    let file = fs::File::open(path).map_err(|e| e.to_string())?;
    let mut archive = ZipArchive::new(file).map_err(|e| e.to_string())?;

    let mut image_names: Vec<String> = (0..archive.len())
        .filter_map(|i| {
            archive.by_index(i).ok().and_then(|entry| {
                let name = entry.name().to_string();
                if is_image(Path::new(&name)) {
                    Some(name)
                } else {
                    None
                }
            })
        })
        .collect();

    image_names.sort();
    let page_count = image_names.len();

    if page_count == 0 {
        return Err("No images found in CBZ".to_string());
    }

    // Extract cover (first image) to cache
    let cover_name = &image_names[0];
    let id = path_id(path);
    let ext = Path::new(cover_name)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("jpg");
    let cover_path = cache_dir.join(format!("{}.{}", id, ext));

    if !cover_path.exists() {
        let mut entry = archive
            .by_name(cover_name)
            .map_err(|e| e.to_string())?;
        let mut bytes = Vec::new();
        entry.read_to_end(&mut bytes).map_err(|e| e.to_string())?;
        fs::write(&cover_path, &bytes).map_err(|e| e.to_string())?;
    }

    Ok((page_count, cover_path.to_string_lossy().into_owned()))
}

/// Scans an image folder: counts images and returns the first as cover.
fn scan_image_folder(path: &Path) -> Result<(usize, String), String> {
    let mut images: Vec<PathBuf> = fs::read_dir(path)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .filter(|p| p.is_file() && is_image(p))
        .collect();

    images.sort();

    if images.is_empty() {
        return Err("No images found in folder".to_string());
    }

    let cover = images[0].to_string_lossy().replace('\\', "/");
    Ok((images.len(), cover))
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

    // Prepare cover cache directory
    let cache_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e: tauri::Error| e.to_string())?
        .join("covers");
    fs::create_dir_all(&cache_dir).map_err(|e| e.to_string())?;

    let mut comics: Vec<Comic> = Vec::new();

    let entries = fs::read_dir(dir).map_err(|e| e.to_string())?;

    for entry in entries.filter_map(|e| e.ok()) {
        let entry_path = entry.path();
        let ext = entry_path
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| e.to_lowercase());

        let result = if ext.as_deref() == Some("cbz") && entry_path.is_file() {
            scan_cbz(&entry_path, &cache_dir).map(|(pages, cover)| {
                ("cbz".to_string(), pages, cover)
            })
        } else if entry_path.is_dir() {
            scan_image_folder(&entry_path).map(|(pages, cover)| {
                ("folder".to_string(), pages, cover)
            })
        } else {
            continue;
        };

        match result {
            Ok((file_type, page_count, cover_path)) => {
                comics.push(Comic {
                    id: path_id(&entry_path),
                    title: title_from_path(&entry_path),
                    path: entry_path.to_string_lossy().into_owned(),
                    cover_path,
                    page_count,
                    file_type,
                });
            }
            Err(e) => {
                eprintln!("Skipping {:?}: {}", entry_path, e);
            }
        }
    }

    comics.sort_by(|a, b| a.title.to_lowercase().cmp(&b.title.to_lowercase()));

    Ok(comics)
}
