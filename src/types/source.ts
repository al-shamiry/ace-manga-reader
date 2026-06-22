export interface Source {
  id: string;
  name: string;
  path: string;
  path_missing: boolean;
  manga_count: number;
  hidden: boolean;
  scanned_at: number;
  sort_order: number;
}
