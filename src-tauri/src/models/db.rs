//! The central persisted database (`manga_db.json`): the source registry and
//! per-manga state, keyed by id. Pure data + small invariant helpers;
//! load/save lives in `store::db`.

use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use crate::models::manga::MangaRecord;
use crate::models::source::SourceRecord;

const CURRENT_VERSION: u32 = 2;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MangaDb {
    #[serde(default = "default_version")]
    pub version: u32,
    #[serde(default)]
    pub sources: HashMap<String, SourceRecord>,
    #[serde(default)]
    pub mangas: HashMap<String, MangaRecord>,
}

impl MangaDb {
    /// Next `sort_order` for a source appended after all existing ones.
    pub fn next_source_order(&self) -> u32 {
        self.sources.values().map(|s| s.sort_order).max().unwrap_or(0) + 1
    }
}

impl Default for MangaDb {
    fn default() -> Self {
        Self {
            version: CURRENT_VERSION,
            sources: HashMap::new(),
            mangas: HashMap::new(),
        }
    }
}

fn default_version() -> u32 {
    CURRENT_VERSION
}
