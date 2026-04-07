use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryEntry {
    pub manga_id: String,
    pub manga_title: String,
    pub manga_path: String,
    pub manga_cover_path: String,
    pub manga_chapter_count: usize,
    pub chapter_id: String,
    pub chapter_title: String,
    pub chapter_path: String,
    pub chapter_file_type: String, // "dir" | "cbz"
    pub last_read_at: u64,         // unix epoch seconds
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct HistoryData {
    pub entries: Vec<HistoryEntry>, // newest first, deduped by chapter_id
}
