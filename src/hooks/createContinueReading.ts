import { useNavigate } from "@solidjs/router";

import * as api from "~/api";
import type { Manga, NavOrigin } from "~/types";

/**
 * Returns a `continueReading(manga)` navigator shared by the library and source
 * grids (and mirrors MangaDetailView's primary-chapter pick). Fetches the
 * chapter list and jumps straight into the reader at the first not-yet-read
 * chapter — resuming an in-progress one at its saved page. If every chapter is
 * already read it falls through to the manga detail view. `from` tags the
 * route state with the originating view.
 */
export function createContinueReading(from: NavOrigin) {
  const navigate = useNavigate();

  return async function continueReading(manga: Manga) {
    try {
      const list = await api.chapters.listChapters(manga.path);
      if (list.length === 0) return;
      const allUnread = list.every((c) => c.status.type === "unread");
      const target = allUnread
        ? list[0]
        : list.find((c) => c.status.type !== "read");
      if (!target) {
        // All chapters read — fall through to manga detail
        navigate("/manga/" + manga.id, { state: { manga, from } });
        return;
      }
      const idx = list.findIndex((c) => c.id === target.id);
      const initialPage =
        target.status.type === "ongoing" ? target.status.page : 0;
      navigate("/reader/" + target.id, {
        state: {
          chapter: target,
          manga,
          prevChapter: list[idx - 1],
          nextChapter: list[idx + 1],
          initialPage,
        },
      });
    } catch (e) {
      console.error("Failed to continue reading:", e);
    }
  };
}
