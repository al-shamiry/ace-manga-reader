use serde::{Deserialize, Serialize};

pub const DEFAULT_CATEGORY_ID: &str = "default";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Category {
    pub id: String,
    pub name: String,
    pub sort_order: u32,
}

impl Category {
    pub fn default_category() -> Self {
        Self {
            id: DEFAULT_CATEGORY_ID.to_string(),
            name: "Default".to_string(),
            sort_order: 0,
        }
    }
}

/// Projected library entry returned to the frontend — a view over `MangaState`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LibraryEntry {
    pub manga_id: String,
    pub title: String,
    pub path: String,
    pub cover_path: String,
    pub chapter_count: usize,
    #[serde(default)]
    pub read_chapters: usize,
    pub category_ids: Vec<String>,
    pub added_at: u64,
    #[serde(default)]
    pub last_read_at: u64,
}
