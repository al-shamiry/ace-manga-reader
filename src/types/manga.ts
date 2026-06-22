export interface Manga {
  id: string;
  title: string;
  path: string;
  cover_path: string;
  chapter_count: number;
  read_chapters?: number;
  last_read_at?: number;
  category_ids?: string[];
  added_at?: number;
}
