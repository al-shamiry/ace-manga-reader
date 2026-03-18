export interface Comic {
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
