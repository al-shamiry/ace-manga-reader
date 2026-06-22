export type ReadingStatus = "unread" | "started" | "completed";

export type SortField =
  | "alphabetical"
  | "total-chapters"
  | "last-read"
  | "date-added";
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
  show_item_count: boolean;
}

export interface LibraryFilters {
  sources: string[];
  reading_status: string[];
}

export interface SourceDisplay {
  display_mode: DisplayMode;
  card_size: number;
  show_unread_badge: boolean;
  show_continue_button: boolean;
}

export interface SourceFilters {
  reading_status: string[];
}
