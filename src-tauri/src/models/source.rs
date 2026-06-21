use std::path::Path;

use serde::{Deserialize, Serialize};

use crate::infra::naming::now_epoch;

/// A source folder as presented to the frontend.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SourceDto {
    pub id: String,
    pub name: String,
    pub path: String,
    pub path_missing: bool,
    pub manga_count: usize,
    pub hidden: bool,
    pub scanned_at: u64,
    pub sort_order: u32,
}

/// Persisted state for a source folder, keyed by source id in `MangaDb`.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SourceRecord {
    pub path: String,
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

impl SourceRecord {
    /// Build a freshly-added source: unscanned, visible, stamped now.
    pub fn new(path: String, name: String, manga_count: usize, sort_order: u32) -> Self {
        Self {
            path,
            scanned_at: 0,
            manga_count,
            name,
            added_at: now_epoch(),
            hidden: false,
            sort_order,
        }
    }

    /// Project this record into the `SourceDto` returned to the frontend.
    pub fn project(&self, id: impl Into<String>) -> SourceDto {
        SourceDto {
            id: id.into(),
            name: self.name.clone(),
            path: self.path.clone(),
            path_missing: !Path::new(&self.path).is_dir(),
            manga_count: self.manga_count,
            hidden: self.hidden,
            scanned_at: self.scanned_at,
            sort_order: self.sort_order,
        }
    }
}
