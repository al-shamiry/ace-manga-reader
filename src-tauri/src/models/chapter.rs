#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum ChapterStatus {
    Unread,
    Ongoing { page: usize },
    Read,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct Chapter {
    pub id: String,
    pub title: String,
    pub path: String,
    pub file_type: String,
    pub page_count: usize,
    pub status: ChapterStatus,
}
