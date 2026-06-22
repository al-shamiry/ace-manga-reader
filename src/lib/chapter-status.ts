import type { Chapter } from "~/types";

export type ChapterFilterStatus = "unread" | "ongoing" | "read";

/** Map a chapter's status to the bucket shown in its badge — an ongoing
 * chapter still on page 0 reads as "New"/Unread, matching StatusBadge. */
export function chapterFilterStatus(c: Chapter): ChapterFilterStatus {
  if (c.status.type === "read") return "read";
  if (c.status.type === "ongoing" && c.status.page > 0) return "ongoing";
  return "unread";
}

export const CHAPTER_FILTERS: { value: ChapterFilterStatus; label: string }[] =
  [
    { value: "unread", label: "Unread" },
    { value: "ongoing", label: "Ongoing" },
    { value: "read", label: "Read" },
  ];
