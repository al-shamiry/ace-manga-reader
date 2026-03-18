use std::fs;
use std::path::{Path, PathBuf};

use sha2::{Digest, Sha256};

const IMAGE_EXTENSIONS: &[&str] = &["jpg", "jpeg", "png", "webp", "gif", "avif"];

pub(crate) fn is_image(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .map(|e| IMAGE_EXTENSIONS.contains(&e.to_lowercase().as_str()))
        .unwrap_or(false)
}

pub(crate) fn path_id(path: &Path) -> String {
    let mut hasher = Sha256::new();
    hasher.update(path.to_string_lossy().as_bytes());
    hex::encode(&hasher.finalize()[..8])
}

pub(crate) fn title_from_path(path: &Path) -> String {
    let stem = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Unknown");

    // Strip download-tool hash suffixes like "_299d43" or "_1a2b3c4d"
    if let Some(idx) = stem.rfind('_') {
        let suffix = &stem[idx + 1..];
        if (4..=16).contains(&suffix.len()) && suffix.chars().all(|c| c.is_ascii_hexdigit()) {
            return stem[..idx].to_string();
        }
    }
    stem.replace("_ ", ": ")
}

pub(crate) fn normalize(path: &Path) -> String {
    path.to_string_lossy().replace('\\', "/")
}

/// Returns sorted subdirectories of a path.
pub(crate) fn subdirs(path: &Path) -> Vec<PathBuf> {
    let mut dirs: Vec<PathBuf> = match fs::read_dir(path) {
        Ok(rd) => rd.filter_map(|e| e.ok()).map(|e| e.path()).filter(|p| p.is_dir()).collect(),
        Err(_) => return Vec::new(),
    };
    dirs.sort();
    dirs
}

/// Returns sorted image files directly inside a directory.
pub(crate) fn images_in(path: &Path) -> Vec<PathBuf> {
    let mut imgs: Vec<PathBuf> = match fs::read_dir(path) {
        Ok(rd) => rd.filter_map(|e| e.ok()).map(|e| e.path()).filter(|p| p.is_file() && is_image(p)).collect(),
        Err(_) => return Vec::new(),
    };
    imgs.sort();
    imgs
}

/// Natural sort comparison — numbers within strings are compared numerically.
/// e.g. "Issue#2" < "Issue#10"
pub(crate) fn natural_cmp(a: &str, b: &str) -> std::cmp::Ordering {
    let mut ai = a.chars().peekable();
    let mut bi = b.chars().peekable();
    loop {
        match (ai.peek(), bi.peek()) {
            (None, None) => return std::cmp::Ordering::Equal,
            (None, _) => return std::cmp::Ordering::Less,
            (_, None) => return std::cmp::Ordering::Greater,
            (Some(ac), Some(bc)) if ac.is_ascii_digit() && bc.is_ascii_digit() => {
                let na: u64 = ai.by_ref().take_while(|c| c.is_ascii_digit()).collect::<String>().parse().unwrap_or(0);
                let nb: u64 = bi.by_ref().take_while(|c| c.is_ascii_digit()).collect::<String>().parse().unwrap_or(0);
                let ord = na.cmp(&nb);
                if ord != std::cmp::Ordering::Equal { return ord; }
            }
            _ => {
                let ac = ai.next().unwrap().to_lowercase().next().unwrap();
                let bc = bi.next().unwrap().to_lowercase().next().unwrap();
                let ord = ac.cmp(&bc);
                if ord != std::cmp::Ordering::Equal { return ord; }
            }
        }
    }
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
