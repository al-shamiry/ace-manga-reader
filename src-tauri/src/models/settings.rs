//! Persisted configuration model: reader defaults, library/source sort &
//! display preferences, filters, and the aggregate `Config` written to
//! `config.json`. Pure data plus the invariants each type owns (value
//! clamping, default-category normalization); persistence lives in
//! `store::config`.

use serde::{Deserialize, Serialize};

use crate::models::category::{Category, DEFAULT_CATEGORY_ID};

// ── Reader settings ──────────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "kebab-case")]
pub enum FitMode {
    FitWidth,
    FitHeight,
    Original,
    Stretch,
    #[default]
    #[serde(other)]
    FitScreen,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "kebab-case")]
pub enum ReadingMode {
    PagedLtr,
    PagedVertical,
    Webtoon,
    #[default]
    #[serde(other)]
    PagedRtl,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct ReaderSettings {
    pub fit_mode: Option<FitMode>,
    pub reading_mode: Option<ReadingMode>,
    pub webtoon_padding: Option<u8>,
}

impl Default for ReaderSettings {
    fn default() -> Self {
        Self {
            fit_mode: Some(FitMode::default()),
            reading_mode: Some(ReadingMode::default()),
            webtoon_padding: None,
        }
    }
}

impl ReaderSettings {
    /// Clamp values to the ranges the UI allows, so out-of-band input from a
    /// command can't be persisted. Webtoon side padding is 0–40%.
    pub fn clamped(mut self) -> Self {
        self.webtoon_padding = self.webtoon_padding.map(|p| p.min(40));
        self
    }
}

// ── Sort & display vocabulary ────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "kebab-case")]
pub enum SortField {
    Alphabetical,
    TotalChapters,
    DateAdded,
    #[default]
    #[serde(other)]
    LastRead,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "kebab-case")]
pub enum SortDirection {
    Asc,
    #[default]
    #[serde(other)]
    Desc,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "kebab-case")]
pub enum DisplayMode {
    Compact,
    CoverOnly,
    List,
    #[default]
    #[serde(other)]
    Comfortable,
}

/// Card size (cover columns) the UI exposes via its slider/zoom controls.
const CARD_SIZE_RANGE: std::ops::RangeInclusive<u8> = 1..=15;

// ── Library & source preferences ─────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct LibrarySortPreference {
    pub field: SortField,
    pub direction: SortDirection,
}

impl Default for LibrarySortPreference {
    fn default() -> Self {
        Self {
            field: SortField::LastRead,
            direction: SortDirection::Desc,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct SourceSortPreference {
    pub field: SortField,
    pub direction: SortDirection,
}

impl Default for SourceSortPreference {
    fn default() -> Self {
        Self {
            field: SortField::Alphabetical,
            direction: SortDirection::Asc,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct LibraryDisplay {
    pub display_mode: DisplayMode,
    pub card_size: u8,
    pub show_unread_badge: bool,
    pub show_continue_button: bool,
    pub show_item_count: bool,
}

impl Default for LibraryDisplay {
    fn default() -> Self {
        Self {
            display_mode: DisplayMode::Comfortable,
            card_size: 8u8,
            show_unread_badge: false,
            show_continue_button: false,
            show_item_count: true,
        }
    }
}

impl LibraryDisplay {
    /// Clamp the card size into the slider's allowed range.
    pub fn clamped(mut self) -> Self {
        self.card_size = self.card_size.clamp(*CARD_SIZE_RANGE.start(), *CARD_SIZE_RANGE.end());
        self
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct SourceDisplay {
    pub display_mode: DisplayMode,
    pub card_size: u8,
    pub show_unread_badge: bool,
    pub show_continue_button: bool,
}

impl Default for SourceDisplay {
    fn default() -> Self {
        Self {
            display_mode: DisplayMode::Comfortable,
            card_size: 8u8,
            show_unread_badge: false,
            show_continue_button: false,
        }
    }
}

impl SourceDisplay {
    /// Clamp the card size into the slider's allowed range.
    pub fn clamped(mut self) -> Self {
        self.card_size = self.card_size.clamp(*CARD_SIZE_RANGE.start(), *CARD_SIZE_RANGE.end());
        self
    }
}

// ── Filters ──────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
pub struct SourceFilters {
    pub reading_status: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
pub struct LibraryFilters {
    pub sources: Vec<String>,
    pub reading_status: Vec<String>,
}

// ── Aggregate config ─────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
pub struct Config {
    pub root_directory: Option<String>,
    pub reader_settings: ReaderSettings,
    pub active_category: Option<String>,
    pub library_sort_preference: LibrarySortPreference,
    pub library_display: LibraryDisplay,
    pub library_filters: LibraryFilters,
    pub source_sort_preference: SourceSortPreference,
    pub source_display: SourceDisplay,
    pub source_filters: SourceFilters,
    pub categories: Vec<Category>,
}

impl Config {
    /// Guarantee the default category always exists, inserted first.
    pub(crate) fn normalize(mut self) -> Self {
        if !self.categories.iter().any(|c| c.id == DEFAULT_CATEGORY_ID) {
            self.categories.insert(0, Category::default());
        }
        self
    }
}
