use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use crate::models::category::DEFAULT_CATEGORY_ID;
use crate::models::chapter::ChapterStatus;

#[derive(Debug, Serialize, Deserialize)]
pub struct MangaDto {
    pub id: String,
    pub title: String,
    pub path: String,
    pub cover_path: String,
    pub chapter_count: usize,
    #[serde(default)]
    pub read_chapters: usize,
    #[serde(default)]
    pub last_read_at: u64,
    #[serde(default)]
    pub category_ids: Vec<String>,
    #[serde(default)]
    pub added_at: u64,
}

/// Persisted state for a manga, keyed by manga id in `MangaDb`.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct MangaRecord {
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

impl MangaRecord {
    /// Project this record into the `MangaDto` returned to the frontend.
    pub fn project(&self, id: impl Into<String>) -> MangaDto {
        MangaDto {
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
