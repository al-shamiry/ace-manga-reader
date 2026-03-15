export interface Comic {
  id: string;
  title: string;
  path: string;
  cover_path: string;
  page_count: number;
  file_type: "dir" | "cbz";
}

export interface Source {
  name: string;
  path: string;
  manga_count: number;
}
