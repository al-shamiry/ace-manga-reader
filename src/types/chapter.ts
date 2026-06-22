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
