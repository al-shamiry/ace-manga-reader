import { Show, createSignal, createMemo, createEffect, on, onMount, onCleanup } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { Library, Plus } from "lucide-solid";
import { invoke } from "@tauri-apps/api/core";
import { useLibrary } from "../context/LibraryContext";
import { MangaGrid } from "../components/MangaGrid";
import { SearchToggle } from "../components/SearchToggle";
import { FilterDropdown, type FilterState } from "../components/FilterDropdown";
import { SortDropdown } from "../components/SortDropdown";
import { DisplayOptionsPopover } from "../components/DisplayOptionsPopover";
import { TabBar } from "../components/TabBar";
import type { Tab } from "../components/TabBar";
import type { Chapter, LibraryEntry, LibraryFilters, LibraryDisplay, Manga, ReadingStatus, SortPreference } from "../types";

export function LibraryView() {
  const { categories, libraryEntries, refreshCategories, refreshLibrary } = useLibrary();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = createSignal("");
  const [slideClass, setSlideClass] = createSignal("");
  const [showCreateDialog, setShowCreateDialog] = createSignal(false);
  const [newCategoryName, setNewCategoryName] = createSignal("");
  const [renaming, setRenaming] = createSignal<{ id: string; name: string } | null>(null);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [filters, setFilters] = createSignal<FilterState>({ sources: [], readingStatus: [] });
  const [sortPref, setSortPref] = createSignal<SortPreference>({ field: "last_read", direction: "desc" });
  const [displayOpts, setDisplayOpts] = createSignal<LibraryDisplay>({
    display_mode: "comfortable",
    card_size: 8,
    show_unread_badge: false,
    show_continue_button: false,
    show_category_tabs: true,
    show_item_count: true,
  });

  // Refresh library entries on mount (picks up last_read_at changes after reading)
  onMount(() => { refreshLibrary(); });

  // Load persisted state
  onMount(async () => {
    try {
      const saved = await invoke<LibraryFilters>("get_library_filters");
      setFilters({
        sources: saved.sources,
        readingStatus: saved.reading_status as ReadingStatus[],
      });
    } catch (_) { /* no saved filters */ }
    try {
      const savedTab = await invoke<string | null>("get_active_category");
      if (savedTab) setActiveTab(savedTab);
    } catch (_) { /* no saved tab */ }
    try {
      const pref = await invoke<SortPreference>("get_sort_preference");
      setSortPref(pref);
    } catch (_) { /* no saved sort */ }
    try {
      const disp = await invoke<LibraryDisplay>("get_library_display");
      setDisplayOpts(disp);
    } catch (_) { /* no saved display */ }
  });

  function handleFilterChange(next: FilterState) {
    setFilters(next);
    invoke("set_library_filters", {
      filters: { sources: next.sources, reading_status: next.readingStatus },
    }).catch(() => {});
  }

  function handleSortChange(next: SortPreference) {
    setSortPref(next);
    invoke("set_sort_preference", { preference: next }).catch(() => {});
  }

  function handleDisplayChange(next: LibraryDisplay) {
    setDisplayOpts(next);
    invoke("set_library_display", { display: next }).catch(() => {});
  }

  function nudgeCardSize(delta: number) {
    const current = displayOpts();
    const next = Math.max(1, Math.min(15, current.card_size + delta));
    if (next === current.card_size) return;
    handleDisplayChange({ ...current, card_size: next });
  }

  // Ctrl + (+/-) to resize cards. Also covers numpad +/- and Ctrl+= (the
  // un-shifted form of Ctrl++ on US layouts).
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

  // Ctrl + wheel to resize cards. Listener must be non-passive so we can
  // preventDefault and block the webview's page zoom.
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

  // Derive available source names from library entries
  const availableSources = createMemo(() => {
    const names = new Set<string>();
    for (const e of libraryEntries()) {
      const parts = e.path.replace(/\\/g, "/").split("/");
      if (parts.length >= 2) names.add(parts[parts.length - 2]);
    }
    return [...names].sort();
  });

  // Map manga_id → unread count for the badge overlay
  const unreadByMangaId = createMemo(() => {
    const map = new Map<string, number>();
    for (const e of libraryEntries()) {
      map.set(e.manga_id, Math.max(0, e.chapter_count - e.read_chapters));
    }
    return map;
  });

  function getUnreadCount(manga: Manga): number {
    return unreadByMangaId().get(manga.id) ?? 0;
  }

  // Continue button: fetch chapters, jump to first non-read (or first unread).
  // Mirrors MangaDetailView's `primaryChapter` logic so behavior is identical.
  async function handleContinue(manga: Manga) {
    try {
      const list = await invoke<Chapter[]>("get_chapters", { mangaPath: manga.path });
      if (list.length === 0) return;
      const allUnread = list.every((c) => c.status.type === "unread");
      const target = allUnread ? list[0] : list.find((c) => c.status.type !== "read");
      if (!target) {
        // All chapters read — fall through to manga detail
        navigate("/manga/" + manga.id, { state: manga });
        return;
      }
      const idx = list.findIndex((c) => c.id === target.id);
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
    } catch (e) {
      console.error("Failed to continue reading:", e);
    }
  }

  function readingStatus(e: LibraryEntry): ReadingStatus {
    if (e.read_chapters === 0) return "unread";
    if (e.read_chapters >= e.chapter_count) return "completed";
    return "started";
  }

  // Filter out Default tab when it's empty and other categories exist
  const visibleCategories = createMemo(() => {
    const cats = categories();
    const entries = libraryEntries();
    if (cats.length <= 1 || entries.length === 0) return cats;

    const defaultCount = entries.filter((e) => e.category_ids.includes("default")).length;
    if (defaultCount === 0) return cats.filter((c) => c.id !== "default");
    return cats;
  });

  // Default to first visible category; update if current tab becomes hidden
  createEffect(on(visibleCategories, (cats) => {
    const current = activeTab();
    if (current === "" || !cats.some((c) => c.id === current)) {
      if (cats.length > 0) setActiveTab(cats[0].id);
    }
  }));

  // Manga entries filtered by active tab
  const filteredEntries = createMemo(() => {
    const tab = activeTab();
    const entries = libraryEntries();
    return entries.filter((e) => e.category_ids.includes(tab));
  });

  // Apply search + filters to entries
  function applyFilters(entries: LibraryEntry[]): LibraryEntry[] {
    const query = searchQuery().toLowerCase().trim();
    const f = filters();
    let result = entries;
    if (query) {
      result = result.filter((e) => e.title.toLowerCase().includes(query));
    }
    if (f.readingStatus.length > 0) {
      result = result.filter((e) => f.readingStatus.includes(readingStatus(e)));
    }
    if (f.sources.length > 0) {
      result = result.filter((e) => {
        const parts = e.path.replace(/\\/g, "/").split("/");
        const source = parts.length >= 2 ? parts[parts.length - 2] : "";
        return f.sources.includes(source);
      });
    }
    return result;
  }

  function sortEntries(entries: LibraryEntry[]): LibraryEntry[] {
    const pref = sortPref();
    const dir = pref.direction === "asc" ? 1 : -1;
    return [...entries].sort((a, b) => {
      switch (pref.field) {
        case "alphabetical":
          return dir * a.title.localeCompare(b.title);
        case "total_chapters":
          return dir * (a.chapter_count - b.chapter_count);
        case "last_read": {
          const aRead = a.last_read_at > 0;
          const bRead = b.last_read_at > 0;
          // desc: read entries first; asc: unread entries first
          if (aRead !== bRead) return dir * (aRead ? 1 : -1);
          // Read entries sorted by last_read_at following direction, unread by added_at inverted
          if (aRead) return dir * (a.last_read_at - b.last_read_at);
          return -dir * (a.added_at - b.added_at);
        }
        case "date_added":
          return dir * (a.added_at - b.added_at);
        default:
          return 0;
      }
    });
  }

  // Convert LibraryEntry to Manga for MangaGrid
  const mangasForGrid = createMemo((): Manga[] =>
    sortEntries(applyFilters(filteredEntries())).map((e) => ({
      id: e.manga_id,
      title: e.title,
      path: e.path,
      cover_path: e.cover_path,
      chapter_count: e.chapter_count,
    }))
  );

  let switching = false;
  function switchTab(newTab: string) {
    if (switching) return;
    const cats = visibleCategories();
    const oldIndex = cats.findIndex((c) => c.id === activeTab());
    const newIndex = cats.findIndex((c) => c.id === newTab);
    if (oldIndex === newIndex) return;

    switching = true;
    const slideIn = newIndex > oldIndex ? "slide-in-left" : "slide-in-right";

    // Fade out old content
    setSlideClass("tab-fade-out");
    setTimeout(() => {
      setActiveTab(newTab);
      invoke("set_active_category", { categoryId: newTab }).catch(() => {});
      setSlideClass(slideIn);
      setTimeout(() => {
        setSlideClass("");
        switching = false;
      }, 200);
    }, 100);
  }

  function countForCategory(categoryId: string): number {
    return applyFilters(libraryEntries().filter((e) => e.category_ids.includes(categoryId))).length;
  }

  const tabs = createMemo((): Tab[] =>
    visibleCategories().map((cat) => ({
      id: cat.id,
      label: cat.name,
      count: displayOpts().show_item_count ? countForCategory(cat.id) : undefined,
      deletable: cat.id !== "default",
    }))
  );

  // ── Category management ──

  async function handleCreateCategory() {
    const name = newCategoryName().trim();
    if (!name) return;
    try {
      await invoke("create_category", { name });
      setNewCategoryName("");
      setShowCreateDialog(false);
      await refreshCategories();
    } catch (e) {
      console.error("Failed to create category:", e);
    }
  }

  async function handleRenameCategory() {
    const r = renaming();
    if (!r || !r.name.trim()) return;
    try {
      await invoke("rename_category", { categoryId: r.id, name: r.name.trim() });
      setRenaming(null);
      await refreshCategories();
    } catch (e) {
      console.error("Failed to rename category:", e);
    }
  }

  async function handleDeleteCategory(categoryId: string) {
    try {
      await invoke("delete_category", { categoryId });
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
    <div class="flex flex-col flex-1 overflow-hidden">
      {/* Library toolbar: tabs + actions */}
      <div class="flex items-center gap-0 px-4 bg-zinc-900 shrink-0">
        <div class="flex items-center overflow-x-auto flex-1 min-w-0">
          <Show when={displayOpts().show_category_tabs}>
            <TabBar
              tabs={tabs()}
              activeTab={activeTab()}
              onSelect={switchTab}
              onRenameStart={(tab) => setRenaming({ id: tab.id, name: tab.label })}
              onDelete={(tab) => handleDeleteCategory(tab.id)}
              renamingId={renaming()?.id}
              renamingValue={renaming()?.name}
              onRenameInput={(value) => setRenaming({ ...renaming()!, name: value })}
              onRenameSubmit={handleRenameCategory}
              onRenameCancel={() => setRenaming(null)}
            />

            {/* Add category button */}
            <button
              class="flex items-center justify-center w-7 h-7 rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors cursor-pointer shrink-0 ml-2"
              onClick={() => setShowCreateDialog(true)}
              title="New category"
            >
              <Plus size={16} />
            </button>
          </Show>
        </div>

        {/* Search, sort & filter actions */}
        <div class="flex items-center gap-1 shrink-0 ml-3">
          <SearchToggle query={searchQuery()} onQueryChange={setSearchQuery} />
          <SortDropdown preference={sortPref()} onChange={handleSortChange} />
          <DisplayOptionsPopover display={displayOpts()} onChange={handleDisplayChange} />
          <FilterDropdown
            state={filters()}
            availableSources={availableSources()}
            onChange={handleFilterChange}
          />
        </div>
      </div>

      {/* Create category dialog */}
      <Show when={showCreateDialog()}>
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowCreateDialog(false)}>
          <div class="bg-zinc-900 border border-zinc-700 rounded-xl p-5 w-80 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 class="text-sm font-semibold text-zinc-100 mb-3">New Category</h3>
            <form onSubmit={(e) => { e.preventDefault(); handleCreateCategory(); }}>
              <input
                autofocus
                class="w-full h-9 px-3 bg-zinc-800 border border-zinc-700 focus:border-indigo-500 text-zinc-100 placeholder:text-zinc-500 rounded-md text-sm outline-none transition-colors"
                placeholder="Category name"
                value={newCategoryName()}
                onInput={(e) => setNewCategoryName(e.currentTarget.value)}
              />
              <div class="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  class="px-3 py-1.5 rounded-md text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="px-3 py-1.5 rounded-md text-sm bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      </Show>

      {/* Manga grid or empty state */}
      <div class={`flex-1 overflow-y-auto ${slideClass()}`}>
        <Show
          when={mangasForGrid().length > 0}
          fallback={
            <div class="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
              <div class="p-5 bg-zinc-900 rounded-2xl text-zinc-600">
                <Library size={48} stroke-width={1} />
              </div>
              <div>
                <p class="text-zinc-300 font-medium">Your library is empty</p>
                <p class="text-zinc-600 text-sm mt-1">
                  Browse your <button class="text-indigo-400 hover:underline cursor-pointer" onClick={() => navigate("/sources")}>sources</button> and add manga to your library
                </p>
              </div>
            </div>
          }
        >
          <MangaGrid
            mangas={mangasForGrid()}
            displayMode={displayOpts().display_mode}
            cardSize={displayOpts().card_size}
            getUnreadCount={displayOpts().show_unread_badge ? getUnreadCount : undefined}
            onContinue={displayOpts().show_continue_button ? handleContinue : undefined}
          />
        </Show>
      </div>
    </div>
  );
}
