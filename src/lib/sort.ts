import type { Manga, SortPreference } from "~/types";

/**
 * Sort a manga list by the given preference. Pure: returns a new array.
 *
 * `last-read` is the nuanced case — read entries cluster on one side of the
 * direction (desc = most-recently-read first) ordered by `last_read_at`, while
 * never-read entries fall to the other side ordered by `added_at` inverted so
 * the freshest additions surface first.
 */
export function sortEntries(entries: Manga[], pref: SortPreference): Manga[] {
  const dir = pref.direction === "asc" ? 1 : -1;
  return [...entries].sort((a, b) => {
    switch (pref.field) {
      case "alphabetical":
        return dir * a.title.localeCompare(b.title);
      case "total-chapters":
        return dir * (a.chapter_count - b.chapter_count);
      case "last-read": {
        const aLastRead = a.last_read_at ?? 0;
        const bLastRead = b.last_read_at ?? 0;
        const aRead = aLastRead > 0;
        const bRead = bLastRead > 0;
        // desc: read entries first; asc: unread entries first
        if (aRead !== bRead) return dir * (aRead ? 1 : -1);
        // Read entries sorted by last_read_at following direction, unread by added_at inverted
        if (aRead) return dir * (aLastRead - bLastRead);
        return -dir * ((a.added_at ?? 0) - (b.added_at ?? 0));
      }
      case "date-added":
        return dir * ((a.added_at ?? 0) - (b.added_at ?? 0));
      default:
        return 0;
    }
  });
}
