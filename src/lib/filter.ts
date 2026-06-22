import type { Manga, ReadingStatus } from "~/types";

import { readingStatus } from "./reading-status";

export interface MangaFilter {
  sources: string[];
  readingStatus: ReadingStatus[];
}

/**
 * Apply the search query + filter chips to a manga list. Pure: takes the raw
 * entries and the current filter state, returns a new filtered array. Source
 * matching keys off the parent folder name (the source basename) of each path.
 */
export function applyFilters(
  entries: Manga[],
  query: string,
  filters: MangaFilter,
): Manga[] {
  const q = query.toLowerCase().trim();
  let result = entries;
  if (q) {
    result = result.filter((e) => e.title.toLowerCase().includes(q));
  }
  if (filters.readingStatus.length > 0) {
    result = result.filter((e) =>
      filters.readingStatus.includes(readingStatus(e)),
    );
  }
  if (filters.sources.length > 0) {
    result = result.filter((e) => {
      const parts = e.path.replace(/\\/g, "/").split("/");
      const source = parts.length >= 2 ? parts[parts.length - 2] : "";
      return filters.sources.includes(source);
    });
  }
  return result;
}
