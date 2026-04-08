use std::collections::HashSet;
use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use rayon::prelude::*;
use tauri::Manager;
use zip::ZipArchive;

use crate::commands::manga_db::{self, MangaDbCache};
use crate::models::manga::Manga;
use crate::models::manga_db::{MangaState, SourceMeta};
use crate::utils::{
    images_in, is_image, natural_cmp, normalize, now_epoch, path_id, subdirs_and_cbz,
    title_from_path,
};

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct Source {
    id: String,
    name: String,
    path: String,
    manga_count: usize,
}

/// Find the cover from explicit cover files or first issue's first image.
fn find_folder_cover(manga_path: &Path, sub_dirs: &[PathBuf]) -> Option<String> {
    for name in &["cover.png", "cover.jpg", "cover.jpeg", "cover.webp"] {
        let candidate = manga_path.join(name);
        if candidate.is_file() {
            return Some(normalize(&candidate));
        }
    }
    let first_issue = sub_dirs.first()?;
    let first_image = images_in(first_issue).into_iter().next()?;
    Some(normalize(&first_image))
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

/// Scan a manga folder that may contain CBZ files, image subdirs, or both.
/// Returns `None` if the folder has no chapters.
fn scan_manga(path: &Path, cache_dir: &Path) -> Option<Result<Manga, String>> {
    let (sub_dirs, cbz_files) = subdirs_and_cbz(path);
    let chapter_count = sub_dirs.len() + cbz_files.len();

    if chapter_count == 0 {
        return None;
    }

    let id = path_id(path);

    // Cover priority: explicit cover file > first image subdir > first CBZ
    let cover_result = find_folder_cover(path, &sub_dirs)
        .map(Ok)
        .or_else(|| cbz_files.first().map(|cbz| extract_cbz_cover(cbz, &id, cache_dir)));

    let cover_path = match cover_result {
        Some(Ok(p)) => p,
        Some(Err(e)) => return Some(Err(e)),
        None => return Some(Err("No cover found".to_string())),
    };

    Some(Ok(Manga {
        id,
        title: title_from_path(path),
        path: normalize(path),
        cover_path,
        chapter_count,
    }))
}

/// Collect all mangas found within `dir`, searching up to `depth` levels deep.
fn collect_mangas(dir: &Path, depth: u32, cache_dir: &Path) -> Vec<Manga> {
    let entries: Vec<PathBuf> = match fs::read_dir(dir) {
        Ok(rd) => rd.filter_map(|e| e.ok()).map(|e| e.path()).filter(|p| p.is_dir()).collect(),
        Err(e) => {
            eprintln!("Cannot read {:?}: {}", dir, e);
            return Vec::new();
        }
    };

    entries
        .par_iter()
        .flat_map(|entry| match scan_manga(entry, cache_dir) {
            Some(Ok(manga)) => vec![manga],
            Some(Err(e)) => {
                eprintln!("Skipping manga {:?}: {}", entry, e);
                vec![]
            }
            None if depth > 0 => collect_mangas(entry, depth - 1, cache_dir),
            None => vec![],
        })
        .collect()
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

#[tauri::command]
pub fn scan_directory(
    path: String,
    force_refresh: bool,
    app_handle: tauri::AppHandle,
) -> Result<Vec<Manga>, String> {
    let dir = Path::new(&path);
    if !dir.is_dir() {
        return Err(format!("'{}' is not a directory", path));
    }

    let source_id = path_id(dir);
    let cache = app_handle.state::<Mutex<MangaDbCache>>();

    // Cache hit: source is known and we have mangas for it → return directly
    if !force_refresh {
        let guard = cache.lock().map_err(|e| e.to_string())?;
        if guard.db.sources.contains_key(&source_id)
            && guard.db.mangas.values().any(|m| m.source_id == source_id)
        {
            let mut mangas: Vec<Manga> = guard
                .db
                .mangas
                .iter()
                .filter(|(_, m)| m.source_id == source_id)
                .map(|(id, m)| Manga {
                    id: id.clone(),
                    title: m.title.clone(),
                    path: m.path.clone(),
                    cover_path: m.cover_path.clone(),
                    chapter_count: m.chapter_count,
                })
                .collect();
            mangas.sort_by(|a, b| natural_cmp(&a.title, &b.title));
            return Ok(mangas);
        }
    }

    // Full disk scan
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e: tauri::Error| e.to_string())?;
    let covers_dir = app_data_dir.join("cache").join("covers");
    fs::create_dir_all(&covers_dir).map_err(|e| e.to_string())?;

    let mut mangas = collect_mangas(dir, 1, &covers_dir);
    mangas.sort_by(|a, b| natural_cmp(&a.title, &b.title));

    // Build the set of manga ids present on disk for this source
    let on_disk_ids: HashSet<String> = mangas.iter().map(|m| m.id.clone()).collect();

    let source_path_str = normalize(dir);
    let scanned_at = now_epoch();

    manga_db::mutate(&cache, &app_handle, |db| {
        // Update source metadata
        db.sources.insert(
            source_id.clone(),
            SourceMeta { source_path: source_path_str, scanned_at },
        );

        // Drop mangas from this source that no longer exist on disk
        db.mangas.retain(|id, m| m.source_id != source_id || on_disk_ids.contains(id));

        // Merge scanned mangas into the db
        for manga in &mangas {
            let entry = db.mangas.entry(manga.id.clone()).or_insert_with(|| MangaState {
                source_id: source_id.clone(),
                title: manga.title.clone(),
                path: manga.path.clone(),
                cover_path: manga.cover_path.clone(),
                cover_override: None,
                chapter_count: manga.chapter_count,
                read_chapters: 0,
                last_read_at: 0,
                added_at: None,
                category_ids: Vec::new(),
                chapters: std::collections::HashMap::new(),
            });
            // Refresh mutable display fields; preserve reading state
            entry.source_id = source_id.clone();
            entry.title = manga.title.clone();
            entry.path = manga.path.clone();
            entry.cover_path = manga.cover_path.clone();
            entry.chapter_count = manga.chapter_count;
        }
    })?;

    Ok(mangas)
}
