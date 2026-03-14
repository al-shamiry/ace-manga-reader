use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Comic {
    pub id: String,
    pub title: String,
    pub path: String,
    pub cover_path: String,
    pub page_count: usize,
    pub file_type: String,
}
