use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use crate::models::chapter::ChapterStatus;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SourceMeta {
    pub source_path: String,
    pub scanned_at: u64,
    pub manga_count: usize,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub added_at: u64,
    #[serde(default)]
    pub hidden: bool,
    #[serde(default)]
    pub sort_order: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MangaState {
    pub source_id: String,
    pub title: String,
    pub path: String,
    pub cover_path: String,
    #[serde(default)]
    pub cover_override: Option<String>,
    pub chapter_count: usize,
    #[serde(default)]
    pub read_chapters: usize,
    #[serde(default)]
    pub last_read_at: u64,
    #[serde(default)]
    pub added_at: Option<u64>,
    #[serde(default)]
    pub category_ids: Vec<String>,
    #[serde(default)]
    pub chapters: HashMap<String, ChapterStatus>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MangaDb {
    #[serde(default = "default_version")]
    pub version: u32,
    #[serde(default)]
    pub sources: HashMap<String, SourceMeta>,
    #[serde(default)]
    pub mangas: HashMap<String, MangaState>,
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
