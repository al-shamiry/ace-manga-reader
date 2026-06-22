import type { Manga } from "~/types/manga";

export type NavOrigin = "library" | "sources" | "history";

export interface MangaDetailState {
  manga: Manga;
  from?: NavOrigin;
}
