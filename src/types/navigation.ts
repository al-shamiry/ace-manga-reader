import type { Chapter } from "~/types/chapter";
import type { Manga } from "~/types/manga";

export type NavOrigin = "library" | "sources" | "history";

export interface MangaDetailState {
  manga: Manga;
  from?: NavOrigin;
}

export interface ReaderState {
  chapter: Chapter;
  manga: Manga;
  prevChapter?: Chapter;
  nextChapter?: Chapter;
  initialPage?: number | "last";
}
