import { createMemo, createSignal, onCleanup, onMount, Show } from "solid-js";
import { useLocation, useNavigate } from "@solidjs/router";

import { getCurrentWindow } from "@tauri-apps/api/window";
import { ArrowLeft } from "lucide-solid";

import * as api from "~/api";
import type { Chapter, MangaDetailState } from "~/types";

import { createChapterSelection } from "~/hooks/createChapterSelection";
import {
  type ChapterFilterStatus,
  chapterFilterStatus,
} from "~/lib/chapter-status";

import { ChapterList } from "~/components/manga-detail/ChapterList";
import { DetailHeader } from "~/components/manga-detail/DetailHeader";
import { DetailToolbar } from "~/components/manga-detail/DetailToolbar";
import { Button } from "~/components/ui/button";

import { useLibrary } from "~/context/LibraryContext";
import { useViewLoading } from "~/context/ViewLoadingContext";

export function MangaDetailView() {
  const navigate = useNavigate();
  const location = useLocation();
  const manga = (location.state as MangaDetailState | undefined)?.manga;
  const { categories, libraryEntries, refreshLibrary, refreshCategories } =
    useLibrary();
  const view = useViewLoading();
  // Mark busy synchronously so the overlay paints on the first frame.
  // The "no manga" branch below short-circuits to ready() in onMount.
  const loadToken = view.busy();

  const [chapters, setChapters] = createSignal<Chapter[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal("");

  // ── Toolbar state ──
  const [sortDir, setSortDir] = createSignal<"asc" | "desc">("asc");
  const [statusFilter, setStatusFilter] = createSignal<ChapterFilterStatus[]>(
    [],
  );
  const [refreshing, setRefreshing] = createSignal(false);

  // Backend returns chapters in natural ascending order; apply the status
  // filter, then reverse for descending display.
  const chaptersForDisplay = createMemo(() => {
    const filters = statusFilter();
    let list = chapters();
    if (filters.length > 0) {
      list = list.filter((c) => filters.includes(chapterFilterStatus(c)));
    }
    return sortDir() === "asc" ? list : [...list].reverse();
  });

  // ── Chapter selection ──
  const selection = createChapterSelection(() => chaptersForDisplay());

  async function loadChapters() {
    if (!manga) return;
    const result = await api.chapters.listChapters(manga.path);
    setChapters(result);
  }

  onMount(async () => {
    if (!manga) {
      view.ready(loadToken);
      return;
    }
    getCurrentWindow().setTitle(`Ace Manga Reader — ${manga.title}`);
    try {
      await loadChapters();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
      view.ready(loadToken);
    }
  });

  const primaryChapter = () => {
    const list = chapters();
    if (list.length === 0) return undefined;
    const allUnread = list.every((c) => c.status.type === "unread");
    if (allUnread) return list[0];
    return list.find((c) => c.status.type !== "read");
  };

  const primaryLabel = () => {
    const list = chapters();
    if (list.length === 0) return null;
    const allUnread = list.every((c) => c.status.type === "unread");
    if (allUnread) return "Start Reading";
    const target = list.find((c) => c.status.type !== "read");
    if (!target) return null; // all read
    return "Continue Reading";
  };

  // ── Library helpers ──

  const libraryEntry = () => libraryEntries().find((e) => e.id === manga?.id);
  const isInLibrary = () => !!libraryEntry();
  const currentCategoryIds = () => libraryEntry()?.category_ids ?? [];

  // Refresh categories the first time the menu opens, so newly created
  // categories show up without forcing a navigation cycle.
  function handleMenuOpenChange(open: boolean) {
    if (open) refreshCategories();
  }

  // Toggle a category membership. Each toggle is an immediate commit:
  // - If the manga is not in the library, the first checked category adds it.
  // - If unchecking the last category, the manga is removed from the library.
  // - Otherwise, the new set of categories is persisted.
  async function toggleCategory(catId: string) {
    if (!manga) return;
    const current = currentCategoryIds();
    const next = current.includes(catId)
      ? current.filter((id) => id !== catId)
      : [...current, catId];

    if (next.length === 0) {
      await api.library.removeFromLibrary(manga.id);
    } else {
      await api.library.addToLibrary(manga.id, next);
    }
    await refreshLibrary();
  }

  async function handleRemoveFromLibrary() {
    if (!manga) return;
    await api.library.removeFromLibrary(manga.id);
    await refreshLibrary();
  }

  function openChapter(chapter: Chapter) {
    const idx = chapters().findIndex((c) => c.id === chapter.id);
    navigate("/reader/" + chapter.id, {
      state: {
        chapter,
        manga,
        prevChapter: chapters()[idx - 1],
        nextChapter: chapters()[idx + 1],
      },
    });
  }

  function handleStartReading() {
    const ch = primaryChapter();
    if (ch) openChapter(ch);
  }

  // ── Refresh — re-scan this manga from disk ──

  async function handleRefresh() {
    if (!manga || refreshing()) return;
    setRefreshing(true);
    setError("");
    try {
      const result = await api.chapters.rescanManga(manga.path);
      setChapters(result);
      await refreshLibrary();
    } catch (e) {
      setError(String(e));
    } finally {
      setRefreshing(false);
    }
  }

  // ── Chapter selection ──

  function handleChapterClick(c: Chapter) {
    if (selection.active()) {
      selection.toggle(c);
      return;
    }
    openChapter(c);
  }

  async function bulkMarkChapters(read: boolean) {
    if (!manga) return;
    const chapterIds = selection.selectedIds();
    if (chapterIds.length === 0) return;
    try {
      await api.chapters.setChaptersRead(manga.id, chapterIds, read);
      await loadChapters();
      await refreshLibrary();
    } catch (e) {
      console.error("Failed to mark chapters:", e);
    }
    selection.exit();
  }

  function handleSelectionKeys(e: KeyboardEvent) {
    if (!selection.active()) return;
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      selection.exit();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
      e.preventDefault();
      e.stopPropagation();
      selection.toggleAll();
    }
  }

  onMount(() => {
    window.addEventListener("keydown", handleSelectionKeys, true);
    onCleanup(() =>
      window.removeEventListener("keydown", handleSelectionKeys, true),
    );
  });

  return (
    <Show
      when={manga}
      fallback={
        <div class="flex flex-1 flex-col items-center justify-center gap-4 text-ink-500">
          <p class="text-sm">No manga data — navigate here from the library.</p>
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft size={14} /> Back
          </Button>
        </div>
      }
    >
      {(m) => (
        <>
          <DetailToolbar
            selectMode={selection.active()}
            onBack={() => navigate(-1)}
            chaptersEmpty={chapters().length === 0}
            onEnterSelect={selection.enter}
            sortDir={sortDir()}
            onToggleSort={() =>
              setSortDir((d) => (d === "asc" ? "desc" : "asc"))
            }
            statusFilter={statusFilter()}
            onStatusFilterChange={setStatusFilter}
            refreshing={refreshing()}
            onRefresh={handleRefresh}
            selectedCount={selection.count()}
            visibleEmpty={chaptersForDisplay().length === 0}
            onSelectAll={selection.selectAll}
            onSelectNone={selection.selectNone}
            onInvert={selection.invert}
            onMarkRead={() => bulkMarkChapters(true)}
            onMarkUnread={() => bulkMarkChapters(false)}
            onExitSelect={selection.exit}
          />

          <DetailHeader
            manga={m()}
            primaryLabel={primaryLabel()}
            onStartReading={handleStartReading}
            isInLibrary={isInLibrary()}
            categories={categories()}
            currentCategoryIds={currentCategoryIds()}
            onMenuOpenChange={handleMenuOpenChange}
            onToggleCategory={toggleCategory}
            onRemoveFromLibrary={handleRemoveFromLibrary}
          />

          <ChapterList
            loading={loading()}
            error={error()}
            chapters={chapters()}
            visible={chaptersForDisplay()}
            filterActive={statusFilter().length > 0}
            selectMode={selection.active()}
            isSelected={selection.isSelected}
            onChapterClick={handleChapterClick}
          />
        </>
      )}
    </Show>
  );
}
