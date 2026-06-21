//! CBZ (zip) archive primitives: cover extraction, page extraction into a cache
//! directory, and image counting. App/path-agnostic — callers supply the target
//! directories so this stays dependency-free leaf code.

use std::fs;
use std::io::Read;
use std::path::Path;

use zip::ZipArchive;

use crate::error::{AppError, AppResult};
use crate::infra::image::{images_in, is_image};
use crate::infra::naming::normalize;

/// Extract the first image of a CBZ into `cache_dir` as `{cover_id}.{ext}`,
/// returning its normalized path. Skips extraction if already cached.
pub(crate) fn extract_cover(
    cbz_path: &Path,
    cover_id: &str,
    cache_dir: &Path,
) -> AppResult<String> {
    let file = fs::File::open(cbz_path)?;
    let mut archive = ZipArchive::new(file)?;

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

    if image_names.is_empty() {
        return Err(AppError::Invalid("No images in CBZ".to_string()));
    }

    let cover_name = &image_names[0];
    let ext = Path::new(cover_name)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("jpg");
    let cover_path = cache_dir.join(format!("{}.{}", cover_id, ext));

    if !cover_path.exists() {
        let mut entry = archive.by_name(cover_name)?;
        let mut bytes = Vec::new();
        entry.read_to_end(&mut bytes)?;
        fs::write(&cover_path, &bytes)?;
    }

    Ok(normalize(&cover_path))
}

/// Extract every image of a CBZ into `extract_dir` (named `00000.ext`, …),
/// returning their normalized paths. Reuses a non-empty existing extraction.
pub(crate) fn extract_pages(cbz_path: &Path, extract_dir: &Path) -> AppResult<Vec<String>> {
    // Return cached extraction if it already exists.
    if extract_dir.is_dir() {
        let pages: Vec<String> = images_in(extract_dir)
            .iter()
            .map(|p| normalize(p))
            .collect();
        if !pages.is_empty() {
            return Ok(pages);
        }
    }

    fs::create_dir_all(extract_dir)?;

    let file = fs::File::open(cbz_path)?;
    let mut archive = ZipArchive::new(file)?;

    let mut image_names: Vec<String> = (0..archive.len())
        .filter_map(|i| {
            archive.by_index(i).ok().and_then(|e| {
                let name = e.name().to_string();
                if is_image(Path::new(&name)) {
                    Some(name)
                } else {
                    None
                }
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

/// Count the image entries inside a CBZ. Returns 0 on any read error.
pub(crate) fn count_images(cbz_path: &Path) -> usize {
    fs::File::open(cbz_path)
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
