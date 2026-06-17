use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use crate::models::manga::MangaState;
use crate::models::source::SourceMeta;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MangaDb {
    #[serde(default = "default_version")]
    pub version: u32,
    #[serde(default)]
    pub sources: HashMap<String, SourceMeta>,
    #[serde(default)]
    pub mangas: HashMap<String, MangaState>,
}

impl MangaDb {
    /// Next `sort_order` for a source appended after all existing ones.
    pub fn next_source_order(&self) -> u32 {
        self.sources.values().map(|s| s.sort_order).max().unwrap_or(0) + 1
    }
}

fn default_version() -> u32 { 2 }

impl Default for MangaDb {
    fn default() -> Self {
        Self {
            version: 2,
            sources: HashMap::new(),
            mangas: HashMap::new(),
        }
    }
}
