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
  category_ids: string[];
  added_at: number;
}

export type FitMode = "fit-screen" | "fit-width" | "fit-height" | "original" | "stretch";
export type ReadingMode = "paged-ltr" | "paged-rtl" | "paged-vertical" | "webtoon";

export interface Settings {
  fit_mode?: FitMode;
  reading_mode?: ReadingMode;
}
