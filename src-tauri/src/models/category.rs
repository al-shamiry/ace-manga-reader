use serde::{Deserialize, Serialize};

pub const DEFAULT_CATEGORY_ID: &str = "default";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Category {
    pub id: String,
    pub name: String,
    pub sort_order: u32,
}

impl Default for Category {
    fn default() -> Self {
        Self {
            id: DEFAULT_CATEGORY_ID.to_string(),
            name: "Default".to_string(),
            sort_order: 0,
        }
    }
}
