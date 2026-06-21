import { createMemo, createSignal, onCleanup, onMount, Show } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";

import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ArrowLeft, RefreshCw } from "lucide-solid";

import { DisplayOptionsPopover } from "../components/DisplayOptionsPopover";
import { EmptyState } from "../components/EmptyState";
import { FilterDropdown, type FilterState } from "../components/FilterDropdown";
import { MangaGrid } from "../components/MangaGrid";
import { SelectionToolbar } from "../components/SelectionToolbar";
import { MangaGridSkeleton } from "../components/Skeleton";
import { SortDropdown } from "../components/SortDropdown";
import {
  Toolbar,
  ToolbarActions,
  ToolbarButton,
  ToolbarInlineButton,
  ToolbarSearchRow,
  ToolbarTitle,
} from "../components/ui/toolbar";
import { useLibrary } from "../context/LibraryContext";
import { useSources } from "../context/SourcesContext";
import { useViewLoading } from "../context/ViewLoadingContext";
import { createMangaSelection } from "../lib/createMangaSelection";
import type {
  Chapter,
  LibraryDisplay,
  Manga,
  ReadingStatus,
  SortPreference,
} from "../types";

type Status = "idle" | "loading" | "error";

export function SourceView() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getSource, initialLoad, refreshSources } = useSources();
  const { categories, refreshLibrary } = useLibrary();
  const view = useViewLoading();
  const loadToken = view.busy();

  const source = () => getSource(params.id);

  const [mangas, setMangas] = createSignal<Manga[]>([]);
  const [status, setStatus] = createSignal<Status>("idle");
  const [error, setError] = createSignal("");
  const [searchQuery, setSearchQuery] = createSignal("");
  const [filters, setFilters] = createSignal<FilterState>({
    sources: [],
    readingStatus: [],
  });
  const [sortPref, setSortPref] = createSignal<SortPreference>({
    field: "alphabetical",
    direction: "asc",
  });
  const [displayOpts, setDisplayOpts] = createSignal<LibraryDisplay>({
    display_mode: "comfortable",
    card_size: 8,
    show_unread_badge: false,
    show_continue_button: false,
    show_item_count: false,
  });

  onMount(async () => {
    const persistedSort = invoke<SortPreference>("get_source_sort_preference")
      .then((pref) => setSortPref(pref))
      .catch(() => {});
    const persistedDisplay = invoke<{
      display_mode: string;
      card_size: number;
      show_unread_badge: boolean;
      show_continue_button: boolean;
    }>("get_source_display")
      .then((d) =>
        setDisplayOpts((prev) => ({
          ...prev,
          display_mode: d.display_mode as LibraryDisplay["display_mode"],
          card_size: d.card_size,
          show_unread_badge: d.show_unread_badge,
          show_continue_button: d.show_continue_button,
        })),
      )
      .catch(() => {});
    const persistedFilters = invoke<{ reading_status: string[] }>(
      "get_source_filters",
    )
      .then((f) =>
        setFilters({
          sources: [],
          readingStatus: f.reading_status as ReadingStatus[],
        }),
      )
      .catch(() => {});

    await initialLoad();
    const s = source();
    await Promise.all([
      s ? loadMangas(s.path) : Promise.resolve(),
      persistedSort,
      persistedDisplay,
      persistedFilters,
    ]);
    view.ready(loadToken);
  });

  async function loadMangas(path: string, forceRefresh = false) {
    setStatus("loading");
    setError("");
    try {
      const result = await invoke<Manga[]>("scan_source", {
        path,
        forceRefresh,
      });
      setMangas(result);
      setStatus("idle");
      getCurrentWindow().setTitle(`Ace Manga Reader — ${source()?.name}`);
      refreshSources();
    } catch (e) {
      setError(String(e));
      setStatus("error");
    }
  }

  function handleSortChange(next: SortPreference) {
    setSortPref(next);
    invoke("set_source_sort_preference", { preference: next }).catch(() => {});
  }

  function handleDisplayChange(next: LibraryDisplay) {
    setDisplayOpts(next);
    invoke("set_source_display", {
      display: {
        display_mode: next.display_mode,
        card_size: next.card_size,
        show_unread_badge: next.show_unread_badge,
        show_continue_button: next.show_continue_button,
      },
    }).catch(() => {});
  }

  function handleFilterChange(next: FilterState) {
    setFilters(next);
    invoke("set_source_filters", {
      filters: { reading_status: next.readingStatus },
    }).catch(() => {});
  }

  function nudgeCardSize(delta: number) {
    const current = displayOpts();
    const next = Math.max(1, Math.min(15, current.card_size + delta));
    if (next === current.card_size) return;
    handleDisplayChange({ ...current, card_size: next });
  }

  function handleResizeKey(e: KeyboardEvent) {
    if (!e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      nudgeCardSize(1);
    } else if (e.key === "-" || e.key === "_") {
      e.preventDefault();
      nudgeCardSize(-1);
    }
  }

  function handleResizeWheel(e: WheelEvent) {
    if (!e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.deltaY === 0) return;
    e.preventDefault();
    nudgeCardSize(e.deltaY < 0 ? 1 : -1);
  }

  onMount(() => {
    window.addEventListener("keydown", handleResizeKey);
    window.addEventListener("wheel", handleResizeWheel, { passive: false });
    onCleanup(() => {
      window.removeEventListener("keydown", handleResizeKey);
      window.removeEventListener("wheel", handleResizeWheel);
    });
  });

  function mangaReadingStatus(manga: Manga): ReadingStatus {
    const read = manga.read_chapters ?? 0;
    if (read === 0) return "unread";
    if (read >= manga.chapter_count) return "completed";
    return "started";
  }

  async function handleContinue(manga: Manga) {
    try {
      const list = await invoke<Chapter[]>("list_chapters", {
        mangaPath: manga.path,
      });
      if (list.length === 0) return;
      const allUnread = list.every((c) => c.status.type === "unread");
      const target = allUnread
        ? list[0]
        : list.find((c) => c.status.type !== "read");
      if (!target) {
        navigate("/manga/" + manga.id, { state: { manga, from: "sources" } });
        return;
      }
      const idx = list.findIndex((c) => c.id === target.id);
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
    } catch (e) {
      console.error("Failed to continue reading:", e);
    }
  }

  const mangasForDisplay = createMemo(() => {
    const query = searchQuery().toLowerCase().trim();
    const f = filters();
    const pref = sortPref();

    let result = mangas();

    if (query) {
      result = result.filter((m) => m.title.toLowerCase().includes(query));
    }

    if (f.readingStatus.length > 0) {
      result = result.filter((m) =>
        f.readingStatus.includes(mangaReadingStatus(m)),
      );
    }

    const dir = pref.direction === "asc" ? 1 : -1;
    return [...result].sort((a, b) => {
      switch (pref.field) {
        case "alphabetical":
          return dir * a.title.localeCompare(b.title);
        case "total-chapters":
          return dir * (a.chapter_count - b.chapter_count);
        case "last-read": {
          const aAt = a.last_read_at ?? 0;
          const bAt = b.last_read_at ?? 0;
          const aRead = aAt > 0;
          const bRead = bAt > 0;
          if (aRead !== bRead) return dir * (aRead ? 1 : -1);
          if (aRead) return dir * (aAt - bAt);
          return dir * a.title.localeCompare(b.title);
        }
        default:
          return 0;
      }
    });
  });

  // ── Bulk selection ──
  const selection = createMangaSelection(mangasForDisplay);

  // Reload from the cached DB projection so updated read counts / library
  // membership surface, then refresh the library context for card badges.
  async function reloadAfterBulk() {
    const s = source();
    if (s) await loadMangas(s.path, false);
    await refreshLibrary();
  }

  async function bulkMarkRead(read: boolean) {
    const mangaIds = selection.selectedIds();
    if (mangaIds.length === 0) return;
    try {
      await invoke("set_mangas_read", { mangaIds, read });
      await reloadAfterBulk();
    } catch (e) {
      console.error("Failed to mark mangas:", e);
    }
    selection.exit();
  }

  async function bulkApplyCategories(categoryIds: string[]) {
    const mangaIds = selection.selectedIds();
    if (mangaIds.length === 0) return;
    try {
      await invoke("add_mangas_to_categories", { mangaIds, categoryIds });
      await reloadAfterBulk();
    } catch (e) {
      console.error("Failed to assign categories:", e);
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
    <div class="flex flex-1 flex-col overflow-hidden">
      <Toolbar>
        <Show
          when={selection.active()}
          fallback={
            <>
              <ToolbarInlineButton onClick={() => navigate("/sources")}>
                <ArrowLeft size={14} />
                Sources
              </ToolbarInlineButton>
              <ToolbarTitle class="flex-1">{source()?.name}</ToolbarTitle>
              <ToolbarActions>
                <ToolbarInlineButton
                  onClick={selection.enter}
                  disabled={mangasForDisplay().length === 0}
                >
                  Select
                </ToolbarInlineButton>
                <SortDropdown
                  preference={sortPref()}
                  onChange={handleSortChange}
                  excludeFields={["date-added"]}
                  defaultPref={{ field: "alphabetical", direction: "asc" }}
                />
                <DisplayOptionsPopover
                  display={displayOpts()}
                  onChange={handleDisplayChange}
                  showTabsSection={false}
                />
                <FilterDropdown
                  state={filters()}
                  availableSources={[]}
                  onChange={handleFilterChange}
                />
                <ToolbarButton
                  onClick={() => {
                    const s = source();
                    if (s) loadMangas(s.path, true);
                  }}
                  title="Re-scan folder"
                >
                  <RefreshCw size={16} />
                </ToolbarButton>
              </ToolbarActions>
            </>
          }
        >
          <SelectionToolbar
            count={selection.count()}
            visibleCount={mangasForDisplay().length}
            categories={categories()}
            onSelectAll={selection.selectAll}
            onSelectNone={selection.selectNone}
            onInvert={selection.invert}
            onApplyCategories={bulkApplyCategories}
            onMarkRead={() => bulkMarkRead(true)}
            onMarkUnread={() => bulkMarkRead(false)}
            onCancel={selection.exit}
          />
        </Show>
      </Toolbar>
      <ToolbarSearchRow
        value={searchQuery()}
        onInput={setSearchQuery}
        placeholder="Search manga…"
        autofocus
      />
      <div class="flex-1 overflow-y-auto">
        <Show when={status() === "loading"}>
          <MangaGridSkeleton />
        </Show>
        <Show when={status() === "error"}>
          <p class="px-6 py-4 text-sm text-red-400">{error()}</p>
        </Show>
        <Show when={status() === "idle" && mangas().length === 0}>
          <EmptyState
            eyebrow={source()?.name ?? "Source"}
            title="No manga in this source."
            description={
              <>
                Ace expects each manga to live in its own subfolder containing
                chapter folders or{" "}
                <span class="font-mono text-ink-300">.cbz</span> archives. Add
                some, or re-scan if you just dropped files in.
              </>
            }
          />
        </Show>
        <Show
          when={
            status() === "idle" &&
            mangas().length > 0 &&
            mangasForDisplay().length === 0
          }
        >
          <EmptyState
            eyebrow="No results"
            title="No manga match your filters."
            description="Try adjusting the search query or active filters."
          />
        </Show>
        <Show when={mangasForDisplay().length > 0 && status() !== "loading"}>
          <MangaGrid
            mangas={mangasForDisplay()}
            displayMode={displayOpts().display_mode}
            cardSize={displayOpts().card_size}
            showProgressBadge={displayOpts().show_unread_badge}
            onContinue={
              displayOpts().show_continue_button ? handleContinue : undefined
            }
            showLibraryBadge
            selectionMode={selection.active()}
            isSelected={selection.isSelected}
            onToggleSelect={selection.toggle}
            from="sources"
          />
        </Show>
      </div>
    </div>
  );
}
