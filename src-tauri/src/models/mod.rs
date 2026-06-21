//! Data model: serde types shared across the app — DTOs sent to the frontend
//! and the records persisted on disk. No I/O or Tauri here.

pub mod category;
pub mod chapter;
pub mod db;
pub mod history;
pub mod manga;
pub mod settings;
pub mod source;

pub use category::{Category, DEFAULT_CATEGORY_ID};
pub use chapter::{Chapter, ChapterStatus};
pub use db::MangaDb;
pub use history::{HistoryData, HistoryEntry};
pub use manga::{MangaDto, MangaRecord};
pub use settings::{
    Config, LibraryDisplay, LibraryFilters, LibrarySortPreference, ReaderSettings, SourceDisplay,
    SourceFilters, SourceSortPreference,
};
pub use source::{SourceDto, SourceRecord};
