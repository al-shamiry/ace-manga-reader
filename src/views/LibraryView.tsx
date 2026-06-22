import {
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import { useNavigate } from "@solidjs/router";

import { Plus } from "lucide-solid";

import * as api from "~/api";
import type { Manga } from "~/types";

import { createContinueReading } from "~/hooks/createContinueReading";
import { createFirstRun } from "~/hooks/createFirstRun";
import { createLibraryControls } from "~/hooks/createLibraryControls";
import { createMangaSelection } from "~/hooks/createMangaSelection";
import { createTabTransition } from "~/hooks/createTabTransition";
import { applyFilters } from "~/lib/filter";
import { sortEntries } from "~/lib/sort";

import { EmptyState } from "~/components/common/EmptyState";
import { FirstRunWelcome } from "~/components/common/FirstRunWelcome";
import { type Tab, TabBar } from "~/components/common/TabBar";
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
} from "~/components/ui/toolbar";

import { useLibrary } from "~/context/LibraryContext";
import { useSources } from "~/context/SourcesContext";
import { useViewLoading } from "~/context/ViewLoadingContext";

export function LibraryView() {
  const {
    categories,
    libraryEntries,
    refreshCategories,
    refreshLibrary,
    initialLoad,
  } = useLibrary();
  const { sources } = useSources();
  const view = useViewLoading();
  // Mark busy synchronously so the overlay paints on the first frame.
  const loadToken = view.busy();
  const navigate = useNavigate();

  const controls = createLibraryControls();
  const handleContinue = createContinueReading("library");
  const firstRun = createFirstRun();

  const [activeTab, setActiveTab] = createSignal("");
  const [creatingCategory, setCreatingCategory] = createSignal(false);
  const [newCategoryName, setNewCategoryName] = createSignal("");
  const [renaming, setRenaming] = createSignal<{
    id: string;
    name: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = createSignal("");

  // Wait on every async source the view depends on, then declare ready.
  // Order: provider's initial onMount (categories/library/root), local
  // refreshLibrary (picks up last_read_at), the persisted browse controls,
  // and the saved active category. Persisted-state failures are non-fatal
  // (defaults are used) so each resolves regardless and we await them together.
  onMount(async () => {
    const persistedTab = api.settings
      .getActiveCategory()
      .then((savedTab) => {
        if (savedTab) setActiveTab(savedTab);
      })
      .catch(() => {
        /* no saved tab */
      });

    await Promise.all([
      initialLoad(),
      refreshLibrary(),
      controls.loadPersisted(),
      persistedTab,
    ]);
    view.ready(loadToken);
  });

  // Derive available source names from library entries, ordered by user-defined sort_order
  const availableSources = createMemo(() => {
    const names = new Set<string>();
    for (const e of libraryEntries()) {
      const parts = e.path.replace(/\\/g, "/").split("/");
      if (parts.length >= 2) names.add(parts[parts.length - 2]);
    }
    const orderByBasename = new Map<string, number>();
    for (const s of sources()) {
      const basename = s.path.replace(/\\/g, "/").split("/").pop() ?? "";
      orderByBasename.set(basename, s.sort_order);
    }
    return [...names].sort((a, b) => {
      const oa = orderByBasename.get(a) ?? Infinity;
      const ob = orderByBasename.get(b) ?? Infinity;
      return oa !== ob ? oa - ob : a.localeCompare(b);
    });
  });

  // Filter out Default tab when it's empty and other categories exist
  const visibleCategories = createMemo(() => {
    const cats = categories();
    const entries = libraryEntries();
    if (cats.length <= 1 || entries.length === 0) return cats;

    const defaultCount = entries.filter((e) =>
      e.category_ids?.includes("default"),
    ).length;
    if (defaultCount === 0) return cats.filter((c) => c.id !== "default");
    return cats;
  });

  // Default to first visible category; update if current tab becomes hidden
  createEffect(
    on(visibleCategories, (cats) => {
      const current = activeTab();
      if (current === "" || !cats.some((c) => c.id === current)) {
        if (cats.length > 0) setActiveTab(cats[0].id);
      }
    }),
  );

  const tabTransition = createTabTransition({
    tabs: visibleCategories,
    activeTab,
    setActiveTab,
    onCommit: (id) => api.settings.setActiveCategory(id).catch(() => {}),
  });

  // Manga entries filtered by active tab
  const filteredEntries = createMemo(() => {
    const tab = activeTab();
    return libraryEntries().filter((e) => e.category_ids?.includes(tab));
  });

  const mangasForGrid = createMemo((): Manga[] =>
    sortEntries(
      applyFilters(filteredEntries(), searchQuery(), controls.filters()),
      controls.sortPref(),
    ),
  );

  function countForCategory(categoryId: string): number {
    return applyFilters(
      libraryEntries().filter((e) => e.category_ids?.includes(categoryId)),
      searchQuery(),
      controls.filters(),
    ).length;
  }

  const tabs = createMemo((): Tab[] =>
    visibleCategories().map((cat) => ({
      id: cat.id,
      label: cat.name,
      count: controls.displayOpts().show_item_count
        ? countForCategory(cat.id)
        : undefined,
      deletable: cat.id !== "default",
    })),
  );

  // ── Bulk selection ──
  const selection = createMangaSelection(() => mangasForGrid());

  async function bulkMarkRead(read: boolean) {
    const mangaIds = selection.selectedIds();
    if (mangaIds.length === 0) return;
    try {
      await api.library.setMangasRead(mangaIds, read);
      await refreshLibrary();
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
      await refreshLibrary();
    } catch (e) {
      console.error("Failed to assign categories:", e);
    }
    selection.exit();
  }

  async function bulkRemoveFromLibrary() {
    const mangaIds = selection.selectedIds();
    if (mangaIds.length === 0) return;
    try {
      await api.library.removeMangasFromLibrary(mangaIds);
      await refreshLibrary();
    } catch (e) {
      console.error("Failed to remove from library:", e);
    }
    selection.exit();
  }

  async function bulkRemoveFromCategory() {
    const mangaIds = selection.selectedIds();
    const categoryId = activeTab();
    if (mangaIds.length === 0 || !categoryId) return;
    try {
      await api.library.removeMangasFromCategory(mangaIds, categoryId);
      await refreshLibrary();
    } catch (e) {
      console.error("Failed to remove from category:", e);
    }
    selection.exit();
  }

  const currentCategoryName = () =>
    categories().find((c) => c.id === activeTab())?.name;

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

  // ── Category management ──

  function startCreateCategory() {
    setNewCategoryName("");
    setCreatingCategory(true);
  }

  function cancelCreateCategory() {
    setCreatingCategory(false);
    setNewCategoryName("");
  }

  async function submitCreateCategory() {
    const name = newCategoryName().trim();
    if (!name) {
      cancelCreateCategory();
      return;
    }
    try {
      await api.library.createCategory(name);
      await refreshCategories();
    } catch (e) {
      console.error("Failed to create category:", e);
    }
    cancelCreateCategory();
  }

  async function handleRenameCategory() {
    const r = renaming();
    if (!r || !r.name.trim()) return;
    try {
      await api.library.renameCategory(r.id, r.name.trim());
      setRenaming(null);
      await refreshCategories();
    } catch (e) {
      console.error("Failed to rename category:", e);
    }
  }

  async function handleDeleteCategory(categoryId: string) {
    try {
      await api.library.deleteCategory(categoryId);
      if (activeTab() === categoryId) {
        const cats = visibleCategories();
        setActiveTab(cats.length > 0 ? cats[0].id : "");
      }
      await refreshCategories();
      await refreshLibrary();
    } catch (e) {
      console.error("Failed to delete category:", e);
    }
  }

  return (
    <div class="flex flex-1 flex-col overflow-hidden">
      {/* Library toolbar — tabs left, action cluster right. gap-0 because
          the tabs/`+` cluster manages its own spacing inside an overflow
          container. */}
      <Toolbar class="gap-0">
        <Show
          when={selection.active()}
          fallback={
            <>
              <div class="flex h-full min-w-0 flex-1 items-center overflow-x-auto overflow-y-hidden">
                {/* Keyed remount on show_item_count toggle — Kobalte's TabsIndicator
                only observes the selected tab's resize and reads offsetLeft
                synchronously, so reflows from other tabs widening leave the
                indicator misaligned. Remounting forces its onMount path which
                waits a microtask for layout to settle. */}
                <Show
                  when={`${controls.displayOpts().show_item_count ? "with" : "without"}\0${visibleCategories()
                    .map((c) => c.name)
                    .join("\0")}`}
                  keyed
                >
                  {(_key) => (
                    <TabBar
                      tabs={tabs()}
                      activeTab={activeTab()}
                      onSelect={tabTransition.switchTab}
                      onRenameStart={(tab) =>
                        setRenaming({ id: tab.id, name: tab.label })
                      }
                      onDelete={(tab) => handleDeleteCategory(tab.id)}
                      renamingId={renaming()?.id}
                      renamingValue={renaming()?.name}
                      onRenameInput={(value) =>
                        setRenaming({ ...renaming()!, name: value })
                      }
                      onRenameSubmit={handleRenameCategory}
                      onRenameCancel={() => setRenaming(null)}
                    />
                  )}
                </Show>

                {/* Inline category create — replaces a modal. Commit only on
                Enter; Escape or focus loss cancels without creating. This
                keeps the commit path single-entry so there's nothing to
                race against. */}
                <Show
                  when={!creatingCategory()}
                  fallback={
                    <form
                      class="ml-2 flex h-full items-center"
                      onSubmit={(e) => {
                        e.preventDefault();
                        submitCreateCategory();
                      }}
                    >
                      <input
                        ref={(el) => requestAnimationFrame(() => el.focus())}
                        placeholder="Category name"
                        class="h-7 w-32 rounded border border-jade-500 bg-ink-800 px-2 text-sm text-ink-100 outline-none placeholder:text-ink-600"
                        value={newCategoryName()}
                        onInput={(e) =>
                          setNewCategoryName(e.currentTarget.value)
                        }
                        onBlur={cancelCreateCategory}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") cancelCreateCategory();
                        }}
                      />
                    </form>
                  }
                >
                  <ToolbarButton
                    class="ml-2"
                    onClick={startCreateCategory}
                    title="New category"
                  >
                    <Plus size={16} />
                  </ToolbarButton>
                </Show>
              </div>

              {/* Sort & filter actions */}
              <ToolbarActions class="ml-3">
                <ToolbarInlineButton
                  onClick={selection.enter}
                  disabled={mangasForGrid().length === 0}
                >
                  Select
                </ToolbarInlineButton>
                <SortDropdown
                  preference={controls.sortPref()}
                  onChange={controls.handleSortChange}
                />
                <DisplayOptionsPopover
                  display={controls.displayOpts()}
                  onChange={controls.handleDisplayChange}
                />
                <FilterDropdown
                  state={controls.filters()}
                  availableSources={availableSources()}
                  onChange={controls.handleFilterChange}
                />
              </ToolbarActions>
            </>
          }
        >
          <SelectionToolbar
            count={selection.count()}
            visibleCount={mangasForGrid().length}
            categories={categories()}
            onSelectAll={selection.selectAll}
            onSelectNone={selection.selectNone}
            onInvert={selection.invert}
            onApplyCategories={bulkApplyCategories}
            onMarkRead={() => bulkMarkRead(true)}
            onMarkUnread={() => bulkMarkRead(false)}
            onRemoveFromLibrary={bulkRemoveFromLibrary}
            onRemoveFromCategory={bulkRemoveFromCategory}
            currentCategoryName={currentCategoryName()}
            onCancel={selection.exit}
          />
        </Show>
      </Toolbar>

      <ToolbarSearchRow
        value={searchQuery()}
        onInput={setSearchQuery}
        placeholder="Search library…"
        autofocus
      />

      {/* Manga grid or empty state */}
      <div class={`flex-1 overflow-y-auto ${tabTransition.slideClass()}`}>
        <Show
          when={mangasForGrid().length > 0}
          fallback={
            <Show
              when={firstRun.isFirstRun()}
              fallback={
                <Show
                  when={
                    filteredEntries().length > 0 && mangasForGrid().length === 0
                  }
                  fallback={
                    <LibraryEmptyState onBrowse={() => navigate("/sources")} />
                  }
                >
                  <EmptyState
                    eyebrow="No results"
                    title="No manga match your filters."
                    description="Try adjusting the search query or active filters."
                  />
                </Show>
              }
            >
              <FirstRunWelcome onChooseFolder={firstRun.chooseFolder} />
            </Show>
          }
        >
          <MangaGrid
            mangas={mangasForGrid()}
            displayMode={controls.displayOpts().display_mode}
            cardSize={controls.displayOpts().card_size}
            showProgressBadge={controls.displayOpts().show_unread_badge}
            onContinue={
              controls.displayOpts().show_continue_button
                ? handleContinue
                : undefined
            }
            selectionMode={selection.active()}
            isSelected={selection.isSelected}
            onToggleSelect={selection.toggle}
            from="library"
          />
        </Show>
      </div>
    </div>
  );
}

// Library is empty but sources exist — user has a root, just hasn't pinned
// anything yet. Direct them to the source grid where they can star manga.
function LibraryEmptyState(props: { onBrowse: () => void }) {
  return (
    <EmptyState
      eyebrow="Library"
      title="Nothing pinned yet."
      description="Your library is where you keep the manga you're actively reading. Browse your sources, open a manga, and add it here to track progress."
      action={{ label: "Browse sources", onClick: props.onBrowse }}
    />
  );
}
