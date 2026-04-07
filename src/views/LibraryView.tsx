import { Show, createSignal, createMemo, createEffect, on, onMount, onCleanup } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { Plus } from "lucide-solid";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
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
  const { categories, libraryEntries, sources, loadRoot, refreshCategories, refreshLibrary } = useLibrary();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = createSignal("");
  const [slideClass, setSlideClass] = createSignal("");
  const [creatingCategory, setCreatingCategory] = createSignal(false);
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
      await invoke("create_category", { name });
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
      await invoke("rename_category", { categoryId: r.id, name: r.name.trim() });
      setRenaming(null);
      await refreshCategories();
    } catch (e) {
      console.error("Failed to rename category:", e);
    }
  }

  // First-run flow: open the Tauri folder picker, load it, route to sources.
  // No root configured = `sources().length === 0` AND `libraryEntries().length === 0`.
  // The root is the only piece of state that distinguishes "fresh install" from
  // "user has a library but cleared it" — we treat both as empty-with-root if
  // sources is non-empty, and as first-run otherwise.
  const isFirstRun = () => sources().length === 0 && libraryEntries().length === 0;

  async function handleChooseFolder() {
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected === "string" && selected) {
      await loadRoot(selected);
      navigate("/sources");
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
      <div class="flex items-center gap-0 px-4 bg-ink-900 shrink-0">
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

            {/* Inline category create — replaces a modal. Commit only on
                Enter; Escape or focus loss cancels without creating. This
                keeps the commit path single-entry so there's nothing to
                race against. */}
            <Show
              when={!creatingCategory()}
              fallback={
                <form
                  class="flex items-center pb-2.5 pt-3 ml-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitCreateCategory();
                  }}
                >
                  <input
                    autofocus
                    placeholder="Category name"
                    class="h-7 px-2 bg-ink-800 border border-jade-500 text-ink-100 placeholder:text-ink-600 rounded text-sm outline-none w-32"
                    value={newCategoryName()}
                    onInput={(e) => setNewCategoryName(e.currentTarget.value)}
                    onBlur={cancelCreateCategory}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") cancelCreateCategory();
                    }}
                  />
                </form>
              }
            >
              <button
                class="flex items-center justify-center w-7 h-7 rounded-md text-ink-500 hover:bg-ink-800 hover:text-ink-300 transition-colors cursor-pointer shrink-0 ml-2"
                onClick={startCreateCategory}
                title="New category"
              >
                <Plus size={16} />
              </button>
            </Show>
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

      {/* Manga grid or empty state */}
      <div class={`flex-1 overflow-y-auto ${slideClass()}`}>
        <Show
          when={mangasForGrid().length > 0}
          fallback={
            <Show when={isFirstRun()} fallback={<LibraryEmptyState onBrowse={() => navigate("/sources")} />}>
              <FirstRunWelcome onChooseFolder={handleChooseFolder} />
            </Show>
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

// ── Empty states ────────────────────────────────────────────────────────────
// First-run welcome — no root configured. Single editorial CTA that opens
// the folder picker directly. No rounded-icon template, no chained navigation.

function FirstRunWelcome(props: { onChooseFolder: () => void }) {
  return (
    <div class="flex flex-col items-start justify-center h-full max-w-xl mx-auto px-10 gap-6">
      <p class="text-xs uppercase tracking-[0.2em] text-jade-400 font-medium">
        Ace Manga Reader
      </p>
      <h1 class="font-display text-display text-ink-100">
        Point us at your manga.
      </h1>
      <p class="text-base text-ink-400 leading-relaxed max-w-md">
        Pick the folder where your collection lives. We'll scan it once,
        cache the covers, and stay out of the way after that.
      </p>
      <button
        onClick={props.onChooseFolder}
        class="mt-2 px-5 py-2.5 rounded-md bg-jade-600 hover:bg-jade-500 text-white text-sm font-medium transition-colors cursor-pointer shadow-lg shadow-jade-950/40"
      >
        Choose library folder
      </button>
      <div class="mt-6 pt-6 border-t border-ink-800/80 w-full max-w-md">
        <p class="text-[0.7rem] uppercase tracking-wider text-ink-600 font-medium mb-3">
          Expected layout
        </p>
        <pre class="text-xs text-ink-500 leading-relaxed font-mono">
{`root/
  source/
    Manga Title/
      Chapter 01/  ← folders of images
      Chapter 02/
    Another Manga/
      vol01.cbz    ← or .cbz files`}
        </pre>
      </div>
    </div>
  );
}

// Library is empty but sources exist — user has a root, just hasn't pinned
// anything yet. Direct them to the source grid where they can star manga.

function LibraryEmptyState(props: { onBrowse: () => void }) {
  return (
    <div class="flex flex-col items-start justify-center h-full max-w-xl mx-auto px-10 gap-5">
      <p class="text-xs uppercase tracking-[0.2em] text-ink-600 font-medium">
        Library
      </p>
      <h2 class="font-display text-display text-ink-100">
        Nothing pinned yet.
      </h2>
      <p class="text-base text-ink-400 leading-relaxed max-w-md">
        Your library is where you keep the manga you're actively reading.
        Browse your sources, open a manga, and add it here to track progress.
      </p>
      <button
        onClick={props.onBrowse}
        class="mt-2 px-5 py-2.5 rounded-md bg-jade-600 hover:bg-jade-500 text-white text-sm font-medium transition-colors cursor-pointer shadow-lg shadow-jade-950/40"
      >
        Browse sources →
      </button>
    </div>
  );
}
