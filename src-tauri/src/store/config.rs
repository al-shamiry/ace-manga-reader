//! Persistence for the global `Config` (`config.json`) and per-manga reader
//! overrides (`settings/{manga_id}.json`), including the merge of per-manga
//! values over the global defaults.

use std::fs;
use std::path::Path;

use crate::error::AppResult;
use crate::infra::atomic::write_atomic_json;
use crate::infra::paths;
use crate::models::{Config, ReaderSettings};

// ── Global config ────────────────────────────────────────────────────────────

pub(crate) fn load_config(app: &tauri::AppHandle) -> AppResult<Config> {
    let path = paths::config_file(app)?;
    // A missing or unreadable file is treated as a default config.
    let config = fs::read_to_string(path)
        .ok()
        .and_then(|s| serde_json::from_str::<Config>(&s).ok())
        .unwrap_or_default()
        .normalize();
    Ok(config)
}

pub(crate) fn save_config(app: &tauri::AppHandle, config: &Config) -> AppResult<()> {
    write_atomic_json(&paths::config_file(app)?, config)
}

/// Load the config, apply `f`, and persist the result — the shared
/// read-modify-write used by every setter.
pub(crate) fn update_config<F>(app: &tauri::AppHandle, f: F) -> AppResult<()>
where
    F: FnOnce(&mut Config),
{
    let mut config = load_config(app)?;
    f(&mut config);
    save_config(app, &config)
}

// ── Per-manga reader settings ────────────────────────────────────────────────

/// Read a manga's saved reader settings, each field falling back to the global
/// default when unset.
pub(crate) fn load_reader_settings(
    app: &tauri::AppHandle,
    manga_id: &str,
) -> AppResult<ReaderSettings> {
    let defaults = load_config(app)?.reader_settings;
    let settings = match read_reader_settings(&paths::manga_settings_file(app, manga_id)?) {
        Some(m) => ReaderSettings {
            fit_mode: m.fit_mode.or(defaults.fit_mode),
            reading_mode: m.reading_mode.or(defaults.reading_mode),
            webtoon_padding: m.webtoon_padding.or(defaults.webtoon_padding),
        },
        None => defaults,
    };
    Ok(settings)
}

/// Merge a patch into a manga's saved reader settings so partial updates don't
/// clobber other fields, then persist. Missing file → start from all-None.
pub(crate) fn save_reader_settings(
    app: &tauri::AppHandle,
    manga_id: &str,
    patch: ReaderSettings,
) -> AppResult<()> {
    let patch = patch.clamped();
    let path = paths::manga_settings_file(app, manga_id)?;
    let existing = read_reader_settings(&path).unwrap_or(ReaderSettings {
        fit_mode: None,
        reading_mode: None,
        webtoon_padding: None,
    });
    let merged = ReaderSettings {
        fit_mode: patch.fit_mode.or(existing.fit_mode),
        reading_mode: patch.reading_mode.or(existing.reading_mode),
        webtoon_padding: patch.webtoon_padding.or(existing.webtoon_padding),
    };
    write_atomic_json(&path, &merged)
}

fn read_reader_settings(path: &Path) -> Option<ReaderSettings> {
    fs::read_to_string(path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
}
