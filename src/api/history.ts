import { call } from "~/api/client";
import type { HistoryEntry } from "~/types";

export function listHistory(): Promise<HistoryEntry[]> {
  return call<HistoryEntry[]>("list_history");
}

export function recordHistory(entry: HistoryEntry): Promise<void> {
  return call("record_history", { entry });
}

export function deleteHistoryEntry(chapterId: string): Promise<void> {
  return call("delete_history_entry", { chapterId });
}

export function clearHistory(): Promise<void> {
  return call("clear_history");
}
