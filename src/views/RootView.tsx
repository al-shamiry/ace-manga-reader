import { Show, createSignal, createMemo, createEffect, on, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { Library, Plus, Pencil, Trash2 } from "lucide-solid";
import { invoke } from "@tauri-apps/api/core";
import { useLibrary } from "../context/LibraryContext";
import { MangaGrid } from "../components/MangaGrid";
import { SearchToggle } from "../components/SearchToggle";
import { FilterDropdown, type FilterState } from "../components/FilterDropdown";
import { TabBar } from "../components/TabBar";
import type { Tab } from "../components/TabBar";
import type { Category, LibraryEntry, LibraryFilters, Manga, ReadingStatus } from "../types";

export function RootView() {
  const { categories, libraryEntries, refreshCategories, refreshLibrary } = useLibrary();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = createSignal("");
  const [slideClass, setSlideClass] = createSignal("");
  const [showCreateDialog, setShowCreateDialog] = createSignal(false);
  const [newCategoryName, setNewCategoryName] = createSignal("");
  const [contextMenu, setContextMenu] = createSignal<{ x: number; y: number; category: Category } | null>(null);
  const [renaming, setRenaming] = createSignal<{ id: string; name: string } | null>(null);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [filters, setFilters] = createSignal<FilterState>({ sources: [], readingStatus: [] });

  // Load persisted filters
  onMount(async () => {
    try {
      const saved = await invoke<LibraryFilters>("get_library_filters");
      setFilters({
        sources: saved.sources,
        readingStatus: saved.reading_status as ReadingStatus[],
      });
    } catch (_) { /* no saved filters */ }
  });

  function handleFilterChange(next: FilterState) {
    setFilters(next);
    invoke("set_library_filters", {
      filters: { sources: next.sources, reading_status: next.readingStatus },
    }).catch(() => {});
  }

  // Derive available source names from library entries
  const availableSources = createMemo(() => {
    const names = new Set<string>();
    for (const e of libraryEntries()) {
      const parts = e.path.replace(/\\/g, "/").split("/");
      if (parts.length >= 2) names.add(parts[parts.length - 2]);
    }
    return [...names].sort();
  });

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

  // Convert LibraryEntry to Manga for MangaGrid
  const mangasForGrid = createMemo((): Manga[] =>
    applyFilters(filteredEntries()).map((e) => ({
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
      count: countForCategory(cat.id),
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

  function handleContextMenu(e: MouseEvent, category: Category) {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, category });
  }

  function closeContextMenu() {
    setContextMenu(null);
  }

  return (
    <div class="flex flex-col flex-1 overflow-hidden" onClick={closeContextMenu}>
      {/* Library toolbar: tabs + actions */}
      <div class="flex items-center gap-0 px-4 bg-zinc-900 shrink-0">
        <div class="flex items-center overflow-x-auto flex-1 min-w-0">
          <TabBar
            tabs={tabs()}
            activeTab={activeTab()}
            onSelect={switchTab}
            onContextMenu={(e, tab) => {
              const cat = visibleCategories().find((c) => c.id === tab.id);
              if (cat) handleContextMenu(e, cat);
            }}
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
        </div>

        {/* Search & filter actions */}
        <div class="flex items-center gap-1 shrink-0 ml-3">
          <SearchToggle query={searchQuery()} onQueryChange={setSearchQuery} />
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

      {/* Context menu */}
      <Show when={contextMenu()}>
        {(menu) => (
          <div
            class="fixed z-50 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1 min-w-36"
            style={{ left: `${menu().x}px`, top: `${menu().y}px` }}
          >
            <button
              class="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors cursor-pointer"
              onClick={() => {
                setRenaming({ id: menu().category.id, name: menu().category.name });
                closeContextMenu();
              }}
            >
              <Pencil size={14} />
              Rename
            </button>
            <Show when={menu().category.id !== "default"}>
              <button
                class="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-red-400 hover:bg-zinc-700 transition-colors cursor-pointer"
                onClick={() => {
                  handleDeleteCategory(menu().category.id);
                  closeContextMenu();
                }}
              >
                <Trash2 size={14} />
                Delete
              </button>
            </Show>
          </div>
        )}
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
          <MangaGrid mangas={mangasForGrid()} />
        </Show>
      </div>
    </div>
  );
}
