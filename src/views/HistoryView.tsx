import { createSignal, createMemo, onMount, For, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { Trash2 } from "lucide-solid";
import { useViewLoading } from "../context/ViewLoadingContext";
import { EmptyState } from "../components/EmptyState";
import { Toolbar, ToolbarActions, ToolbarButton, ToolbarTitle } from "../components/ui/toolbar";
import type { Chapter, HistoryEntry, Manga } from "../types";
import { formatRelativeDay, formatTime } from "../lib/date";

export function HistoryView() {
  const navigate = useNavigate();
  const view = useViewLoading();
  // Mark busy synchronously so the overlay paints on the first frame.
  const loadToken = view.busy();
  const [entries, setEntries] = createSignal<HistoryEntry[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [confirmingClear, setConfirmingClear] = createSignal(false);

  onMount(async () => {
    try {
      const result = await invoke<HistoryEntry[]>("get_history");
      setEntries(result);
    } catch (e) {
      console.error("Failed to load history:", e);
    } finally {
      setLoading(false);
      view.ready(loadToken);
    }
  });

  // Walk the already-sorted list and emit a new group whenever the day label changes.
  const groups = createMemo(() => {
    const list = entries();
    const out: Array<{ label: string; entries: HistoryEntry[] }> = [];
    let current: { label: string; entries: HistoryEntry[] } | null = null;
    for (const e of list) {
      const label = formatRelativeDay(e.last_read_at);
      if (!current || current.label !== label) {
        current = { label, entries: [] };
        out.push(current);
      }
      current.entries.push(e);
    }
    return out;
  });

  async function handleResume(e: HistoryEntry) {
    const manga: Manga = {
      id: e.manga_id,
      title: e.manga_title,
      path: e.manga_path,
      cover_path: e.manga_cover_path,
      chapter_count: e.manga_chapter_count,
    };
    try {
      const list = await invoke<Chapter[]>("get_chapters", { mangaPath: manga.path });
      const idx = list.findIndex((c) => c.id === e.chapter_id);
      if (idx === -1) {
        // Chapter no longer exists on disk — drop the dead entry.
        await invoke("delete_history_entry", { chapterId: e.chapter_id });
        setEntries(entries().filter((x) => x.chapter_id !== e.chapter_id));
        return;
      }
      const target = list[idx];
      const initialPage = target.status.type === "ongoing" ? target.status.page : 0;
      navigate("/reader/" + target.id, {
        state: {
          chapter: target,
          manga,
          prevChapter: list[idx - 1],
          nextChapter: list[idx + 1],
          initialPage,
        },
      });
    } catch (err) {
      console.error("Failed to resume from history:", err);
    }
  }

  async function handleDelete(e: HistoryEntry) {
    setEntries(entries().filter((x) => x.chapter_id !== e.chapter_id));
    try {
      await invoke("delete_history_entry", { chapterId: e.chapter_id });
    } catch (err) {
      console.error("Failed to delete history entry:", err);
    }
  }

  async function handleClearAll() {
    try {
      await invoke("clear_history");
      setEntries([]);
    } catch (err) {
      console.error("Failed to clear history:", err);
    } finally {
      setConfirmingClear(false);
    }
  }

  return (
    <div class="flex flex-col flex-1 overflow-hidden">
      <Toolbar>
        <ToolbarTitle>History</ToolbarTitle>
        <div class="flex-1" />
        <Show
          when={!confirmingClear()}
          fallback={
            <ToolbarActions>
              <button
                class="h-8 cursor-pointer rounded-md px-2.5 text-xs font-medium text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-100"
                onClick={() => setConfirmingClear(false)}
              >
                Cancel
              </button>
              <button
                class="h-8 cursor-pointer rounded-md px-2.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-950/40 hover:text-red-300"
                onClick={handleClearAll}
              >
                Clear all
              </button>
            </ToolbarActions>
          }
        >
          <Show when={entries().length > 0}>
            <ToolbarButton onClick={() => setConfirmingClear(true)} title="Clear all history">
              <Trash2 size={16} />
            </ToolbarButton>
          </Show>
        </Show>
      </Toolbar>

      {/* Body — single scroll container so the empty state inherits the
          same sized parent as the populated list (EmptyState uses h-full). */}
      <Show when={!loading()}>
        <div class="flex-1 overflow-y-auto">
          <Show when={entries().length > 0} fallback={<HistoryEmptyState />}>
            <div class="max-w-3xl mx-auto px-8 pb-12">
              <For each={groups()}>
                {(group, i) => (
                  <section class={i() === 0 ? "mt-10" : "mt-12"}>
                    <h2 class="text-[0.7rem] uppercase tracking-[0.2em] text-ink-600 font-medium mb-3">
                      {group.label}
                    </h2>
                    <For each={group.entries}>
                      {(entry) => (
                        <HistoryRow
                          entry={entry}
                          onResume={handleResume}
                          onDelete={handleDelete}
                        />
                      )}
                    </For>
                  </section>
                )}
              </For>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
}

function HistoryRow(props: {
  entry: HistoryEntry;
  onResume: (e: HistoryEntry) => void;
  onDelete: (e: HistoryEntry) => void;
}) {
  return (
    <div
      class="group flex items-center gap-4 py-3 border-b border-ink-900/60 cursor-pointer hover:bg-ink-900/40 transition-colors"
      onClick={() => props.onResume(props.entry)}
    >
      <img
        src={convertFileSrc(props.entry.manga_cover_path)}
        alt=""
        class="w-12 h-16 rounded-sm object-cover bg-ink-900 shrink-0"
        loading="lazy"
        draggable={false}
      />
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-ink-100 truncate">{props.entry.manga_title}</p>
        <p class="text-xs text-ink-500 mt-0.5 truncate">
          {props.entry.chapter_title}
          <span class="text-ink-700"> · </span>
          <span class="tabular-nums">{formatTime(props.entry.last_read_at)}</span>
        </p>
      </div>
      <button
        class="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 p-1.5 rounded text-ink-600 hover:text-red-400 hover:bg-ink-800 transition-all cursor-pointer shrink-0"
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

function HistoryEmptyState() {
  return (
    <EmptyState
      eyebrow="History"
      title="Nothing to look back on yet."
      description="Open a chapter and it'll appear here so you can pick up exactly where you left off."
    />
  );
}
