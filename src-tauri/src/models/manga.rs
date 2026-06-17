use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Manga {
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
