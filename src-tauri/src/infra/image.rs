//! Image-file detection and on-disk discovery of chapter/manga directory
//! contents (image pages, chapter subdirectories, and CBZ archives).

use std::fs;
use std::path::{Path, PathBuf};

const IMAGE_EXTENSIONS: &[&str] = &["jpg", "jpeg", "png", "webp", "gif", "avif"];

/// Whether `path`'s extension marks it as a supported image.
pub(crate) fn is_image(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .map(|e| IMAGE_EXTENSIONS.contains(&e.to_lowercase().as_str()))
        .unwrap_or(false)
}

/// Whether a directory holds at least one image, short-circuiting on the first
/// match.
pub(crate) fn has_image(path: &Path) -> bool {
    let Ok(rd) = fs::read_dir(path) else {
        return false;
    };
    for entry in rd.filter_map(|e| e.ok()) {
        let is_file = entry.file_type().map(|t| t.is_file()).unwrap_or(false);
        if is_file && is_image(&entry.path()) {
            return true;
        }
    }
    false
}

/// Returns sorted image files directly inside a directory.
pub(crate) fn images_in(path: &Path) -> Vec<PathBuf> {
    let mut imgs: Vec<PathBuf> = match fs::read_dir(path) {
        Ok(rd) => rd
            .filter_map(|e| e.ok())
            .map(|e| e.path())
            .filter(|p| p.is_file() && is_image(p))
            .collect(),
        Err(_) => return Vec::new(),
    };
    imgs.sort();
    imgs
}

/// Returns sorted (subdirectories, CBZ files) from a single directory read.
pub(crate) fn subdirs_and_cbz(path: &Path) -> (Vec<PathBuf>, Vec<PathBuf>) {
    let mut dirs = Vec::new();
    let mut cbz = Vec::new();
    if let Ok(rd) = fs::read_dir(path) {
        for entry in rd.filter_map(|e| e.ok()) {
            let p = entry.path();
            if p.is_dir() {
                dirs.push(p);
            } else if p.is_file()
                && p.extension()
                    .and_then(|e| e.to_str())
                    .map(|e| e.eq_ignore_ascii_case("cbz"))
                    .unwrap_or(false)
            {
                cbz.push(p);
            }
        }
    }
    dirs.sort();
    cbz.sort();
    (dirs, cbz)
}
