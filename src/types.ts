export interface Manga {
  id: string;
  title: string;
  path: string;
  cover_path: string;
  chapter_count: number;
}

export type ChapterStatus =
  | { type: "unread" }
  | { type: "ongoing"; page: number }
  | { type: "read" };

export interface Chapter {
  id: string;
  title: string;
  path: string;
  file_type: "dir" | "cbz";
  page_count: number;
  status: ChapterStatus;
}

export interface Source {
  id: string;
  name: string;
  path: string;
  manga_count: number;
}

export interface Category {
  id: string;
  name: string;
  sort_order: number;
}

export interface LibraryEntry {
  manga_id: string;
  title: string;
  path: string;
  cover_path: string;
  chapter_count: number;
  read_chapters: number;
  category_ids: string[];
  added_at: number;
  last_read_at: number;
}

export interface LibraryFilters {
  sources: string[];
  reading_status: string[];
}

export type ReadingStatus = "unread" | "started" | "completed";

export type SortField = "alphabetical" | "total_chapters" | "last_read" | "date_added";
export type SortDirection = "asc" | "desc";

export interface SortPreference {
  field: SortField;
  direction: SortDirection;
}

export type DisplayMode = "compact" | "comfortable" | "cover-only" | "list";

export interface LibraryDisplay {
  display_mode: DisplayMode;
  card_size: number;
  show_unread_badge: boolean;
  show_continue_button: boolean;
  show_category_tabs: boolean;
  show_item_count: boolean;
}

export type FitMode = "fit-screen" | "fit-width" | "fit-height" | "original" | "stretch";
export type ReadingMode = "paged-ltr" | "paged-rtl" | "paged-vertical" | "webtoon";

export interface Settings {
  fit_mode?: FitMode;
  reading_mode?: ReadingMode;
}
