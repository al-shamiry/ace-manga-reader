use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};

use serde::Serialize;
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
    hasher.update(normalize(path).as_bytes());
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

/// Returns the current Unix timestamp in seconds.
pub(crate) fn now_epoch() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

/// Write `value` as pretty JSON to `path` atomically: write to a `.tmp` sibling,
/// fsync, then rename over the target. On Windows `fs::rename` uses `MoveFileExW`.
pub(crate) fn write_atomic_json<T: Serialize>(path: &Path, value: &T) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let tmp = path.with_extension("tmp");
    let json = serde_json::to_string_pretty(value).map_err(|e| e.to_string())?;
    {
        let mut f = fs::File::create(&tmp).map_err(|e| e.to_string())?;
        f.write_all(json.as_bytes()).map_err(|e| e.to_string())?;
        f.sync_all().map_err(|e| e.to_string())?;
    }
    fs::rename(&tmp, path).map_err(|e| e.to_string())
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
