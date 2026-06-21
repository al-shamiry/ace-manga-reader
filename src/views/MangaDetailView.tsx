import {
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import { useLocation, useNavigate } from "@solidjs/router";

import { invoke } from "@tauri-apps/api/core";
import { convertFileSrc } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  ArrowDownNarrowWide,
  ArrowLeft,
  ArrowUpNarrowWide,
  Bookmark,
  Check,
  CheckCheck,
  Circle,
  Play,
  RefreshCw,
  SlidersHorizontal,
  Square,
  SquareCheck,
  SquaresIntersect,
  Trash2,
} from "lucide-solid";

import { EmptyState } from "../components/EmptyState";
import { Button } from "../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuGroupLabel,
  DropdownMenuHeader,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  Toolbar,
  ToolbarActions,
  ToolbarButton,
  toolbarIconButtonClass,
  ToolbarInlineButton,
  ToolbarSpacer,
  ToolbarTitle,
} from "../components/ui/toolbar";
import { useLibrary } from "../context/LibraryContext";
import { useViewLoading } from "../context/ViewLoadingContext";
import type { Chapter, ChapterStatus, MangaDetailState } from "../types";

type ChapterFilterStatus = "unread" | "ongoing" | "read";

/** Map a chapter's status to the bucket shown in its badge — an ongoing
 * chapter still on page 0 reads as "New"/Unread, matching StatusBadge. */
function chapterFilterStatus(c: Chapter): ChapterFilterStatus {
  if (c.status.type === "read") return "read";
  if (c.status.type === "ongoing" && c.status.page > 0) return "ongoing";
  return "unread";
}

const CHAPTER_FILTERS: { value: ChapterFilterStatus; label: string }[] = [
  { value: "unread", label: "Unread" },
  { value: "ongoing", label: "Ongoing" },
  { value: "read", label: "Read" },
];

/** Anchored chapter status filter — mirrors the library FilterDropdown shape
 * (badge count + reset) but scoped to a single manga's chapter statuses. */
function ChapterFilterMenu(props: {
  state: ChapterFilterStatus[];
  onChange: (next: ChapterFilterStatus[]) => void;
}) {
  const count = () => props.state.length;
  function toggle(v: ChapterFilterStatus) {
    const cur = props.state;
    props.onChange(cur.includes(v) ? cur.filter((s) => s !== v) : [...cur, v]);
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        class={toolbarIconButtonClass}
        title="Filter chapters"
      >
        <SlidersHorizontal size={16} />
        <Show when={count() > 0}>
          <span class="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-jade-500 px-1 text-[10px] font-bold text-ink-950">
            {count()}
          </span>
        </Show>
      </DropdownMenuTrigger>
      <DropdownMenuContent class="w-48">
        <DropdownMenuHeader
          onReset={() => props.onChange([])}
          canReset={count() > 0}
        >
          Filter
        </DropdownMenuHeader>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuGroupLabel>Reading status</DropdownMenuGroupLabel>
          <For each={CHAPTER_FILTERS}>
            {(opt) => (
              <DropdownMenuCheckboxItem
                checked={props.state.includes(opt.value)}
                onChange={() => toggle(opt.value)}
                closeOnSelect={false}
              >
                {opt.label}
              </DropdownMenuCheckboxItem>
            )}
          </For>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function StatusBadge(props: { status: ChapterStatus }) {
  switch (props.status.type) {
    case "read":
      return (
        <span class="rounded bg-ink-800 px-1.5 py-0.5 text-[0.65rem] font-semibold text-ink-500">
          Done
        </span>
      );
    case "ongoing":
      if (props.status.page === 0) {
        return (
          <span class="rounded bg-ink-800 px-1.5 py-0.5 text-[0.65rem] font-semibold text-ink-100">
            New
          </span>
        );
      }
      return (
        <span class="rounded bg-jade-900/50 px-1.5 py-0.5 text-[0.65rem] font-semibold text-jade-400">
          Page {props.status.page + 1}
        </span>
      );
    default:
      return (
        <span class="rounded bg-ink-800 px-1.5 py-0.5 text-[0.65rem] font-semibold text-ink-100">
          New
        </span>
      );
  }
}

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
  // ── Chapter selection ──
  const [selectMode, setSelectMode] = createSignal(false);
  const [selectedIds, setSelectedIds] = createSignal<Set<string>>(new Set());

  async function loadChapters() {
    if (!manga) return;
    const result = await invoke<Chapter[]>("list_chapters", {
      mangaPath: manga.path,
    });
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
      await invoke("remove_from_library", { mangaId: manga.id });
    } else {
      await invoke("add_to_library", {
        mangaId: manga.id,
        categoryIds: next,
      });
    }
    await refreshLibrary();
  }

  async function handleRemoveFromLibrary() {
    if (!manga) return;
    await invoke("remove_from_library", { mangaId: manga.id });
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

  // ── Refresh — re-scan this manga from disk ──

  async function handleRefresh() {
    if (!manga || refreshing()) return;
    setRefreshing(true);
    setError("");
    try {
      const result = await invoke<Chapter[]>("rescan_manga", {
        mangaPath: manga.path,
      });
      setChapters(result);
      await refreshLibrary();
    } catch (e) {
      setError(String(e));
    } finally {
      setRefreshing(false);
    }
  }

  // ── Chapter selection ──

  const isSelected = (c: Chapter) => selectedIds().has(c.id);

  function enterSelect() {
    setSelectedIds(new Set<string>());
    setSelectMode(true);
  }

  function exitSelect() {
    setSelectMode(false);
    setSelectedIds(new Set<string>());
  }

  function toggleSelect(c: Chapter) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(c.id)) next.delete(c.id);
      else next.add(c.id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(chaptersForDisplay().map((c) => c.id)));
  }

  function selectNone() {
    setSelectedIds(new Set<string>());
  }

  function invertSelection() {
    setSelectedIds((prev) => {
      const next = new Set<string>();
      for (const c of chaptersForDisplay()) {
        if (!prev.has(c.id)) next.add(c.id);
      }
      return next;
    });
  }

  // Ctrl+A: select all visible, or clear when everything visible is selected.
  function toggleAll() {
    const vis = chaptersForDisplay();
    const all = vis.length > 0 && vis.every((c) => selectedIds().has(c.id));
    setSelectedIds(all ? new Set<string>() : new Set(vis.map((c) => c.id)));
  }

  function handleChapterClick(c: Chapter) {
    if (selectMode()) {
      toggleSelect(c);
      return;
    }
    openChapter(c);
  }

  async function bulkMarkChapters(read: boolean) {
    if (!manga) return;
    const chapterIds = [...selectedIds()];
    if (chapterIds.length === 0) return;
    try {
      await invoke("set_chapters_read", {
        mangaId: manga.id,
        chapterIds,
        read,
      });
      await loadChapters();
      await refreshLibrary();
    } catch (e) {
      console.error("Failed to mark chapters:", e);
    }
    exitSelect();
  }

  function handleSelectionKeys(e: KeyboardEvent) {
    if (!selectMode()) return;
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      exitSelect();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
      e.preventDefault();
      e.stopPropagation();
      toggleAll();
    }
  }

  onMount(() => {
    window.addEventListener("keydown", handleSelectionKeys, true);
    onCleanup(() =>
      window.removeEventListener("keydown", handleSelectionKeys, true),
    );
  });

  if (!manga) {
    return (
      <div class="flex flex-1 flex-col items-center justify-center gap-4 text-ink-500">
        <p class="text-sm">No manga data — navigate here from the library.</p>
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} /> Back
        </Button>
      </div>
    );
  }

  return (
    <>
      <Toolbar>
        <Show
          when={selectMode()}
          fallback={
            <>
              <ToolbarInlineButton onClick={() => navigate(-1)}>
                <ArrowLeft size={14} />
                Back
              </ToolbarInlineButton>
              <ToolbarSpacer />
              <ToolbarActions>
                <ToolbarInlineButton
                  onClick={enterSelect}
                  disabled={chapters().length === 0}
                >
                  Select
                </ToolbarInlineButton>
                <ToolbarButton
                  onClick={() =>
                    setSortDir((d) => (d === "asc" ? "desc" : "asc"))
                  }
                  title={sortDir() === "asc" ? "Oldest first" : "Newest first"}
                >
                  <Show
                    when={sortDir() === "asc"}
                    fallback={<ArrowUpNarrowWide size={16} />}
                  >
                    <ArrowDownNarrowWide size={16} />
                  </Show>
                </ToolbarButton>
                <ChapterFilterMenu
                  state={statusFilter()}
                  onChange={setStatusFilter}
                />
                <ToolbarButton
                  onClick={handleRefresh}
                  disabled={refreshing()}
                  title="Re-scan this manga from disk"
                >
                  <RefreshCw
                    size={16}
                    class={refreshing() ? "animate-spin" : ""}
                  />
                </ToolbarButton>
              </ToolbarActions>
            </>
          }
        >
          <ToolbarTitle class="flex-1">
            {selectedIds().size} selected
          </ToolbarTitle>
          <ToolbarActions>
            <ToolbarButton
              onClick={selectAll}
              title="Select all"
              disabled={chaptersForDisplay().length === 0}
            >
              <SquareCheck size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={selectNone}
              title="Select none"
              disabled={selectedIds().size === 0}
            >
              <Square size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={invertSelection}
              title="Invert selection"
              disabled={chaptersForDisplay().length === 0}
            >
              <SquaresIntersect size={16} />
            </ToolbarButton>
            <div class="mx-1 h-5 w-px shrink-0 bg-ink-800" />
            <ToolbarInlineButton
              onClick={() => bulkMarkChapters(true)}
              disabled={selectedIds().size === 0}
            >
              <CheckCheck size={14} /> Mark read
            </ToolbarInlineButton>
            <ToolbarInlineButton
              onClick={() => bulkMarkChapters(false)}
              disabled={selectedIds().size === 0}
            >
              <Circle size={14} /> Mark unread
            </ToolbarInlineButton>
            <ToolbarInlineButton onClick={exitSelect}>
              Cancel
            </ToolbarInlineButton>
          </ToolbarActions>
        </Show>
      </Toolbar>

      {/* Header */}
      <div class="flex shrink-0 gap-5 border-b border-ink-800 p-5">
        <img
          src={convertFileSrc(manga.cover_path)}
          alt={manga.title}
          class="w-28 shrink-0 rounded-lg bg-ink-800 object-cover shadow-lg shadow-black/40"
        />
        <div class="flex min-w-0 flex-1 flex-col justify-center gap-3">
          <h1 class="line-clamp-2 font-display text-display text-ink-100">
            {manga.title}
          </h1>
          <p class="text-xs font-medium tracking-wider text-ink-500 uppercase">
            {manga.chapter_count}{" "}
            {manga.chapter_count === 1 ? "chapter" : "chapters"}
          </p>
          <div class="mt-1 flex items-center gap-2">
            <Show when={primaryLabel()}>
              <Button
                variant="primary"
                onClick={() => {
                  const ch = primaryChapter();
                  if (ch) openChapter(ch);
                }}
              >
                <Play size={12} />
                {primaryLabel()}
              </Button>
            </Show>
            {/* Category picker — anchored dropdown, not a centered modal.
                Toggling a checkbox commits immediately; clearing the last
                category removes the manga from the library. The explicit
                Remove item is kept for users who want a one-click bail. */}
            <DropdownMenu onOpenChange={handleMenuOpenChange}>
              <DropdownMenuTrigger
                as={Button}
                variant={isInLibrary() ? "primary" : "ghost"}
                title={
                  isInLibrary() ? "Edit library categories" : "Add to library"
                }
              >
                <Bookmark
                  size={14}
                  fill={isInLibrary() ? "currentColor" : "none"}
                />
                {isInLibrary() ? "In Library" : "Add to Library"}
              </DropdownMenuTrigger>
              <DropdownMenuContent class="w-56">
                <div class="px-2 pt-2 pb-1 text-xs font-semibold tracking-wider text-ink-500 uppercase">
                  {isInLibrary() ? "Categories" : "Add to category"}
                </div>
                <DropdownMenuSeparator />
                <div class="max-h-60 overflow-y-auto">
                  <For each={categories()}>
                    {(cat) => (
                      <DropdownMenuCheckboxItem
                        checked={currentCategoryIds().includes(cat.id)}
                        onChange={() => toggleCategory(cat.id)}
                        closeOnSelect={false}
                      >
                        {cat.name}
                      </DropdownMenuCheckboxItem>
                    )}
                  </For>
                </div>
                <Show when={isInLibrary()}>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    class="gap-2 text-red-400 focus:bg-red-950/40 focus:text-red-300"
                    onSelect={handleRemoveFromLibrary}
                  >
                    <Trash2 size={14} />
                    Remove from library
                  </DropdownMenuItem>
                </Show>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Chapter count */}
      <div class="shrink-0 border-b border-ink-800 px-4 py-2 text-xs font-semibold tracking-wider text-ink-500 uppercase">
        <Show when={!loading()} fallback="…">
          <Show
            when={statusFilter().length > 0}
            fallback={
              <>
                {chapters().length}{" "}
                {chapters().length === 1 ? "chapter" : "chapters"}
              </>
            }
          >
            {chaptersForDisplay().length} of {chapters().length} chapters
          </Show>
        </Show>
      </div>

      {/* Chapter list */}
      <div class="flex-1 overflow-y-auto">
        <Show when={error()}>
          <p class="px-4 py-3 text-sm text-red-400">{error()}</p>
        </Show>

        <Show when={!loading() && chapters().length === 0 && !error()}>
          <EmptyState
            eyebrow="Chapters"
            title="No chapters in this folder."
            description={
              <>
                Ace expects this manga to contain either chapter subfolders
                (each with images inside) or{" "}
                <span class="font-mono text-ink-300">.cbz</span> archives. Check
                the folder contents and try refreshing.
              </>
            }
          />
        </Show>

        <Show
          when={
            !loading() &&
            chapters().length > 0 &&
            chaptersForDisplay().length === 0 &&
            !error()
          }
        >
          <EmptyState
            eyebrow="No results"
            title="No chapters match this filter."
            description="Try adjusting the chapter status filter."
          />
        </Show>

        <For each={chaptersForDisplay()}>
          {(chapter) => (
            <button
              class={`flex w-full items-center gap-3 border-b border-ink-800/50 px-4 py-3 text-left transition-colors hover:bg-ink-800/60 ${
                selectMode() && isSelected(chapter) ? "bg-jade-950/30" : ""
              }`}
              onClick={() => handleChapterClick(chapter)}
            >
              <Show when={selectMode()}>
                <div
                  class={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors ${
                    isSelected(chapter)
                      ? "border-jade-500 bg-jade-500 text-ink-950"
                      : "border-ink-600 text-transparent"
                  }`}
                >
                  <Check size={12} strokeWidth={3} />
                </div>
              </Show>
              <span class="flex-1 truncate text-sm text-ink-200">
                {chapter.title}
              </span>
              <span class="mr-2 shrink-0 text-xs text-ink-600">
                {chapter.page_count}p
              </span>
              <StatusBadge status={chapter.status} />
            </button>
          )}
        </For>
      </div>
    </>
  );
}
