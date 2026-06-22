export interface HistoryEntry {
  manga_id: string;
  manga_title: string;
  manga_path: string;
  manga_cover_path: string;
  manga_chapter_count: number;
  chapter_id: string;
  chapter_title: string;
  chapter_path: string;
  chapter_file_type: "dir" | "cbz";
  last_read_at: number;
}
