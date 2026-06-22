import type { Manga, ReadingStatus } from "~/types";

/**
 * Coarse reading state derived from chapter counts: nothing read yet
 * (`unread`), everything read (`completed`), or somewhere in between
 * (`started`). Used by the library/source filters.
 */
export function readingStatus(manga: Manga): ReadingStatus {
  const read = manga.read_chapters ?? 0;
  if (read === 0) return "unread";
  if (read >= manga.chapter_count) return "completed";
  return "started";
}
