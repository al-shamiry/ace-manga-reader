import { convertFileSrc } from "@tauri-apps/api/core";
import { Trash2 } from "lucide-solid";

import type { HistoryEntry } from "~/types";

import { formatTime } from "~/lib/date";

interface HistoryRowProps {
  entry: HistoryEntry;
  onResume: (e: HistoryEntry) => void;
  onDelete: (e: HistoryEntry) => void;
}

export function HistoryRow(props: HistoryRowProps) {
  return (
    <div
      class="group flex cursor-pointer items-center gap-4 border-b border-ink-900/60 py-3 transition-colors hover:bg-ink-900/40"
      onClick={() => props.onResume(props.entry)}
    >
      <img
        src={convertFileSrc(props.entry.manga_cover_path)}
        alt=""
        class="h-16 w-12 shrink-0 rounded-sm bg-ink-900 object-cover"
        loading="lazy"
        draggable={false}
      />
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-medium text-ink-100">
          {props.entry.manga_title}
        </p>
        <p class="mt-0.5 truncate text-xs text-ink-500">
          {props.entry.chapter_title}
          <span class="text-ink-700"> · </span>
          <span class="tabular-nums">
            {formatTime(props.entry.last_read_at)}
          </span>
        </p>
      </div>
      <button
        class="shrink-0 cursor-pointer rounded p-1.5 text-ink-600 opacity-0 transition-all group-hover:opacity-100 hover:bg-ink-800 hover:text-red-400 focus-visible:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          props.onDelete(props.entry);
        }}
        title="Remove from history"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
