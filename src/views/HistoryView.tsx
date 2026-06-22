import { createMemo, createSignal, For, onMount, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";

import { Trash2 } from "lucide-solid";

import * as api from "~/api";
import type { HistoryEntry, Manga } from "~/types";

import { groupByDay } from "~/lib/history-groups";

import { EmptyState } from "~/components/common/EmptyState";
import { HistoryGroup } from "~/components/history/HistoryGroup";
import {
  Toolbar,
  ToolbarActions,
  ToolbarButton,
  ToolbarSearchRow,
  ToolbarTitle,
} from "~/components/ui/toolbar";

import { useViewLoading } from "~/context/ViewLoadingContext";

export function HistoryView() {
  const navigate = useNavigate();
  const view = useViewLoading();
  // Mark busy synchronously so the overlay paints on the first frame.
  const loadToken = view.busy();
  const [entries, setEntries] = createSignal<HistoryEntry[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [confirmingClear, setConfirmingClear] = createSignal(false);
  const [searchQuery, setSearchQuery] = createSignal("");

  onMount(async () => {
    try {
      const result = await api.history.listHistory();
      setEntries(result);
    } catch (e) {
      console.error("Failed to load history:", e);
    } finally {
      setLoading(false);
      view.ready(loadToken);
    }
  });

  const filteredEntries = createMemo(() => {
    const q = searchQuery().toLowerCase().trim();
    if (!q) return entries();
    return entries().filter((e) => e.manga_title.toLowerCase().includes(q));
  });

  const groups = createMemo(() => groupByDay(filteredEntries()));

  async function handleResume(e: HistoryEntry) {
    const manga: Manga = {
      id: e.manga_id,
      title: e.manga_title,
      path: e.manga_path,
      cover_path: e.manga_cover_path,
      chapter_count: e.manga_chapter_count,
    };
    try {
      const list = await api.chapters.listChapters(manga.path);
      const idx = list.findIndex((c) => c.id === e.chapter_id);
      if (idx === -1) {
        // Chapter no longer exists on disk — drop the dead entry.
        await api.history.deleteHistoryEntry(e.chapter_id);
        setEntries(entries().filter((x) => x.chapter_id !== e.chapter_id));
        return;
      }
      const target = list[idx];
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
    } catch (err) {
      console.error("Failed to resume from history:", err);
    }
  }

  async function handleDelete(e: HistoryEntry) {
    setEntries(entries().filter((x) => x.chapter_id !== e.chapter_id));
    try {
      await api.history.deleteHistoryEntry(e.chapter_id);
    } catch (err) {
      console.error("Failed to delete history entry:", err);
    }
  }

  async function handleClearAll() {
    try {
      await api.history.clearHistory();
      setEntries([]);
    } catch (err) {
      console.error("Failed to clear history:", err);
    } finally {
      setConfirmingClear(false);
    }
  }

  return (
    <div class="flex flex-1 flex-col overflow-hidden">
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
            <ToolbarActions>
              <ToolbarButton
                onClick={() => setConfirmingClear(true)}
                title="Clear all history"
              >
                <Trash2 size={16} />
              </ToolbarButton>
            </ToolbarActions>
          </Show>
        </Show>
      </Toolbar>

      <Show when={entries().length > 0}>
        <ToolbarSearchRow
          value={searchQuery()}
          onInput={setSearchQuery}
          placeholder="Search history…"
          autofocus
        />
      </Show>

      {/* Body — single scroll container so the empty state inherits the
          same sized parent as the populated list (EmptyState uses h-full). */}
      <Show when={!loading()}>
        <div class="flex-1 overflow-y-auto">
          <Show
            when={filteredEntries().length > 0}
            fallback={
              entries().length > 0 ? (
                <EmptyState
                  eyebrow="History"
                  title="No results."
                  description={`No history entries match "${searchQuery()}".`}
                />
              ) : (
                <HistoryEmptyState />
              )
            }
          >
            <div class="mx-auto max-w-3xl px-8 pb-12">
              <For each={groups()}>
                {(group, i) => (
                  <HistoryGroup
                    group={group}
                    first={i() === 0}
                    onResume={handleResume}
                    onDelete={handleDelete}
                  />
                )}
              </For>
            </div>
          </Show>
        </div>
      </Show>
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
