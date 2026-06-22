import { call } from "~/api/client";
import type { Chapter } from "~/types";

export function listChapters(mangaPath: string): Promise<Chapter[]> {
  return call<Chapter[]>("list_chapters", { mangaPath });
}

export function rescanManga(mangaPath: string): Promise<Chapter[]> {
  return call<Chapter[]>("rescan_manga", { mangaPath });
}

export function setChaptersRead(
  mangaId: string,
  chapterIds: string[],
  read: boolean,
): Promise<void> {
  return call("set_chapters_read", { mangaId, chapterIds, read });
}
