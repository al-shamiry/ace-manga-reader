use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Manga {
    pub id: String,
    pub title: String,
    pub path: String,
    pub cover_path: String,
    pub chapter_count: usize,
}
