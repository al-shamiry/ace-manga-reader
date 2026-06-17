use std::collections::HashMap;
use std::path::Path;

use serde::{Deserialize, Serialize};

use crate::models::category::DEFAULT_CATEGORY_ID;
use crate::models::chapter::ChapterStatus;
use crate::models::manga::Manga;
use crate::utils::now_epoch;

/// A source folder as presented to the frontend.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Source {
    pub id: String,
    pub name: String,
    pub path: String,
    pub path_missing: bool,
    pub manga_count: usize,
    pub hidden: bool,
    pub scanned_at: u64,
    pub sort_order: u32,
}

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

impl SourceMeta {
    /// Build a freshly-added source: unscanned, visible, stamped now.
    pub fn new(source_path: String, name: String, manga_count: usize, sort_order: u32) -> Self {
        Self {
            source_path,
            scanned_at: 0,
            manga_count,
            name,
            added_at: now_epoch(),
            hidden: false,
            sort_order,
        }
    }

    /// Project this meta into the `Source` DTO returned to the frontend.
    pub fn project(&self, id: impl Into<String>) -> Source {
        Source {
            id: id.into(),
            name: self.name.clone(),
            path: self.source_path.clone(),
            path_missing: !Path::new(&self.source_path).is_dir(),
            manga_count: self.manga_count,
            hidden: self.hidden,
            scanned_at: self.scanned_at,
            sort_order: self.sort_order,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
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

impl MangaState {
    /// Project this state into the `Manga` DTO returned to the frontend.
    pub fn project(&self, id: impl Into<String>) -> Manga {
        Manga {
            id: id.into(),
            title: self.title.clone(),
            path: self.path.clone(),
            cover_path: self.cover_path.clone(),
            chapter_count: self.chapter_count,
            read_chapters: self.read_chapters,
            last_read_at: self.last_read_at,
            category_ids: self.category_ids.clone(),
            added_at: self.added_at.unwrap_or(0),
        }
    }

    /// Ensure a library manga always belongs to at least the default category.
    pub fn ensure_default_category(&mut self) {
        if self.added_at.is_some() && self.category_ids.is_empty() {
            self.category_ids.push(DEFAULT_CATEGORY_ID.to_string());
        }
    }
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
