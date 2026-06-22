import { createMemo, createSignal, onCleanup, onMount, Show } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";

import { getCurrentWindow } from "@tauri-apps/api/window";
import { ArrowLeft, RefreshCw } from "lucide-solid";

import * as api from "~/api";
import type { Manga } from "~/types";

import { createContinueReading } from "~/hooks/createContinueReading";
import { createLibraryControls } from "~/hooks/createLibraryControls";
import { createMangaSelection } from "~/hooks/createMangaSelection";
import { applyFilters } from "~/lib/filter";
import { sortEntries } from "~/lib/sort";

import { EmptyState } from "~/components/common/EmptyState";
import { MangaGridSkeleton } from "~/components/common/Skeleton";
import { DisplayOptionsPopover } from "~/components/library/DisplayOptionsPopover";
import { FilterDropdown } from "~/components/library/FilterDropdown";
import { SelectionToolbar } from "~/components/library/SelectionToolbar";
import { SortDropdown } from "~/components/library/SortDropdown";
import { MangaGrid } from "~/components/manga/MangaGrid";
import {
  Toolbar,
  ToolbarActions,
  ToolbarButton,
  ToolbarInlineButton,
  ToolbarSearchRow,
  ToolbarTitle,
} from "~/components/ui/toolbar";

import { useLibrary } from "~/context/LibraryContext";
import { useSources } from "~/context/SourcesContext";
import { useViewLoading } from "~/context/ViewLoadingContext";

type Status = "idle" | "loading" | "error";

export function SourceView() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getSource, initialLoad, refreshSources } = useSources();
  const { categories, refreshLibrary } = useLibrary();
  const view = useViewLoading();
  const loadToken = view.busy();

  const controls = createLibraryControls("source");
  const handleContinue = createContinueReading("sources");

  const source = () => getSource(params.id);

  const [mangas, setMangas] = createSignal<Manga[]>([]);
  const [status, setStatus] = createSignal<Status>("idle");
  const [error, setError] = createSignal("");
  const [searchQuery, setSearchQuery] = createSignal("");

  onMount(async () => {
    const persisted = controls.loadPersisted();
    await initialLoad();
    const s = source();
    await Promise.all([s ? loadMangas(s.path) : Promise.resolve(), persisted]);
    view.ready(loadToken);
  });

  async function loadMangas(path: string, forceRefresh = false) {
    setStatus("loading");
    setError("");
    try {
      const result = await api.sources.scanSource(path, forceRefresh);
      setMangas(result);
      setStatus("idle");
      getCurrentWindow().setTitle(`Ace Manga Reader — ${source()?.name}`);
      refreshSources();
    } catch (e) {
      setError(String(e));
      setStatus("error");
    }
  }

  const mangasForDisplay = createMemo((): Manga[] =>
    sortEntries(
      applyFilters(mangas(), searchQuery(), controls.filters()),
      controls.sortPref(),
    ),
  );

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
      await api.library.setMangasRead(mangaIds, read);
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
      await api.library.addMangasToCategories(mangaIds, categoryIds);
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
                  preference={controls.sortPref()}
                  onChange={controls.handleSortChange}
                  excludeFields={["date-added"]}
                  defaultPref={{ field: "alphabetical", direction: "asc" }}
                />
                <DisplayOptionsPopover
                  display={controls.displayOpts()}
                  onChange={controls.handleDisplayChange}
                  showTabsSection={false}
                />
                <FilterDropdown
                  state={controls.filters()}
                  availableSources={[]}
                  onChange={controls.handleFilterChange}
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
            displayMode={controls.displayOpts().display_mode}
            cardSize={controls.displayOpts().card_size}
            showProgressBadge={controls.displayOpts().show_unread_badge}
            onContinue={
              controls.displayOpts().show_continue_button
                ? handleContinue
                : undefined
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
