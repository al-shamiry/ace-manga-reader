import type { HistoryEntry } from "~/types";

import { formatRelativeDay } from "~/lib/date";

export interface HistoryDayGroup {
  label: string;
  entries: HistoryEntry[];
}

// Walk the already-sorted list and emit a new group whenever the day label changes.
export function groupByDay(entries: HistoryEntry[]): HistoryDayGroup[] {
  const out: HistoryDayGroup[] = [];
  let current: HistoryDayGroup | null = null;
  for (const e of entries) {
    const label = formatRelativeDay(e.last_read_at);
    if (!current || current.label !== label) {
      current = { label, entries: [] };
      out.push(current);
    }
    current.entries.push(e);
  }
  return out;
}
