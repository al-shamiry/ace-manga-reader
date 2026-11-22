import type { LibraryDisplay } from "~/types";

/**
 * Placeholder display shown before the persisted value loads. Mirrors
 * `LibraryDisplay::default()` in Rust; the backend is the source of truth.
 */
export const DEFAULT_DISPLAY: LibraryDisplay = {
  display_mode: "comfortable",
  card_size: 8,
  show_unread_badge: false,
  show_continue_button: false,
  show_item_count: true,
};
