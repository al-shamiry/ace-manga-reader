//! Cover/page cache maintenance tied to source lifecycle: drop cached covers
//! and extracted pages when a source is removed, and rename cached covers when
//! a relocation changes manga ids.

use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::PathBuf;

use crate::error::AppResult;
use crate::infra::paths;

/// Remove cached covers for `manga_ids` and extracted page dirs for
/// `chapter_ids`. Best-effort: individual failures are ignored.
pub(crate) fn cleanup_source_cache(
    app: &tauri::AppHandle,
    manga_ids: &[String],
    chapter_ids: &[String],
) -> AppResult<()> {
    let covers_dir = paths::covers_dir(app)?;
    let pages_dir = paths::pages_dir(app)?;

    if covers_dir.is_dir() {
        let id_set: HashSet<&str> = manga_ids.iter().map(|s| s.as_str()).collect();
        if let Ok(rd) = fs::read_dir(&covers_dir) {
            for entry in rd.filter_map(|e| e.ok()) {
                if let Some(stem) = entry.path().file_stem().and_then(|s| s.to_str()) {
                    if id_set.contains(stem) {
                        let _ = fs::remove_file(entry.path());
                    }
                }
            }
        }
    }

    for cid in chapter_ids {
        let dir = pages_dir.join(cid);
        if dir.is_dir() {
            let _ = fs::remove_dir_all(&dir);
        }
    }

    Ok(())
}

/// Rename cached cover files whose manga id changed during a relocation,
/// following the old→new id map.
pub(crate) fn rename_cached_covers(
    app: &tauri::AppHandle,
    id_map: &HashMap<String, String>,
) -> AppResult<()> {
    if id_map.is_empty() {
        return Ok(());
    }

    let covers_dir = paths::covers_dir(app)?;
    if !covers_dir.is_dir() {
        return Ok(());
    }

    let mut renames: Vec<(PathBuf, PathBuf)> = Vec::new();
    for entry in fs::read_dir(&covers_dir)? {
        let path = entry?.path();
        let Some(stem) = path.file_stem().and_then(|s| s.to_str()) else {
            continue;
        };
        let Some(new_id) = id_map.get(stem) else {
            continue;
        };
        if stem == new_id {
            continue;
        }

        let new_name = match path.extension().and_then(|e| e.to_str()) {
            Some(ext) => format!("{}.{}", new_id, ext),
            None => new_id.to_string(),
        };
        renames.push((path, covers_dir.join(new_name)));
    }

    for (from, to) in renames {
        if to.exists() {
            let _ = fs::remove_file(&from);
            continue;
        }
        if let Err(e) = fs::rename(&from, &to) {
            eprintln!(
                "Failed to rename cached cover {:?} -> {:?}: {}",
                from, to, e
            );
        }
    }

    Ok(())
}
