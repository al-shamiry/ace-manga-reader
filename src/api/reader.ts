import { call } from "~/api/client";
import type { Chapter, Settings } from "~/types";

export function getMangaReaderSettings(mangaId: string): Promise<Settings> {
  return call<Settings>("get_manga_reader_settings", { mangaId });
}

export function setMangaReaderSettings(
  mangaId: string,
  settings: Partial<Settings>,
): Promise<void> {
  return call("set_manga_reader_settings", { mangaId, settings });
}

export function openChapter(
  chapterPath: string,
  fileType: Chapter["file_type"],
): Promise<string[]> {
  return call<string[]>("open_chapter", { chapterPath, fileType });
}

export function setChapterProgress(
  mangaId: string,
  chapterId: string,
  page: number,
  totalPages: number,
): Promise<void> {
  return call("set_chapter_progress", {
    mangaId,
    chapterId,
    page,
    totalPages,
  });
}
