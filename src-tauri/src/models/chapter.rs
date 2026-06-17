use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum ChapterStatus {
    Unread,
    Ongoing { page: usize },
    Read,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Chapter {
    pub id: String,
    pub title: String,
    pub path: String,
    pub file_type: String,
    pub page_count: usize,
    pub status: ChapterStatus,
}
