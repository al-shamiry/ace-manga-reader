import { Show, For, createSignal, createMemo } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { Library, Plus, Pencil, Trash2 } from "lucide-solid";
import { invoke } from "@tauri-apps/api/core";
import { useLibrary } from "../context/LibraryContext";
import { MangaGrid } from "../components/MangaGrid";
import type { Category, Manga } from "../types";

const ALL_TAB_ID = "__all__";

export function RootView() {
  const { categories, libraryEntries, refreshCategories, refreshLibrary } = useLibrary();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = createSignal(ALL_TAB_ID);
  const [showCreateDialog, setShowCreateDialog] = createSignal(false);
  const [newCategoryName, setNewCategoryName] = createSignal("");
  const [contextMenu, setContextMenu] = createSignal<{ x: number; y: number; category: Category } | null>(null);
  const [renaming, setRenaming] = createSignal<{ id: string; name: string } | null>(null);

  // Filter out Default tab when it's empty and other categories exist
  const visibleCategories = createMemo(() => {
    const cats = categories();
    const entries = libraryEntries();
    if (cats.length <= 1) return cats;

    const defaultCount = entries.filter((e) => e.category_ids.includes("default")).length;
    if (defaultCount === 0) return cats.filter((c) => c.id !== "default");
    return cats;
  });

  // Manga entries filtered by active tab
  const filteredEntries = createMemo(() => {
    const tab = activeTab();
    const entries = libraryEntries();
    if (tab === ALL_TAB_ID) return entries;
    return entries.filter((e) => e.category_ids.includes(tab));
  });

  // Convert LibraryEntry to Manga for MangaGrid
  const mangasForGrid = createMemo((): Manga[] =>
    filteredEntries().map((e) => ({
      id: e.manga_id,
      title: e.title,
      path: e.path,
      cover_path: e.cover_path,
      chapter_count: e.chapter_count,
    }))
  );

  function countForCategory(categoryId: string): number {
    return libraryEntries().filter((e) => e.category_ids.includes(categoryId)).length;
  }

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
      if (activeTab() === categoryId) setActiveTab(ALL_TAB_ID);
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
      {/* Category tab bar */}
      <div class="flex items-center gap-1 px-3 py-2 bg-zinc-900 border-b border-zinc-800 shrink-0 overflow-x-auto">
        {/* All tab */}
        <button
          class="px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors cursor-pointer"
          classList={{
            "bg-indigo-600 text-white": activeTab() === ALL_TAB_ID,
            "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200": activeTab() !== ALL_TAB_ID,
          }}
          onClick={() => setActiveTab(ALL_TAB_ID)}
        >
          All
          <span class="ml-1.5 text-xs opacity-70">{libraryEntries().length}</span>
        </button>

        {/* Category tabs */}
        <For each={visibleCategories()}>
          {(cat) => {
            const isRenaming = () => renaming()?.id === cat.id;
            return (
              <Show
                when={!isRenaming()}
                fallback={
                  <form
                    class="flex items-center"
                    onSubmit={(e) => { e.preventDefault(); handleRenameCategory(); }}
                  >
                    <input
                      autofocus
                      class="h-7 px-2 bg-zinc-800 border border-indigo-500 text-zinc-100 rounded text-sm outline-none w-28"
                      value={renaming()!.name}
                      onInput={(e) => setRenaming({ ...renaming()!, name: e.currentTarget.value })}
                      onBlur={handleRenameCategory}
                      onKeyDown={(e) => { if (e.key === "Escape") setRenaming(null); }}
                    />
                  </form>
                }
              >
                <button
                  class="px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors cursor-pointer"
                  classList={{
                    "bg-indigo-600 text-white": activeTab() === cat.id,
                    "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200": activeTab() !== cat.id,
                  }}
                  onClick={() => setActiveTab(cat.id)}
                  onContextMenu={(e) => handleContextMenu(e, cat)}
                >
                  {cat.name}
                  <span class="ml-1.5 text-xs opacity-70">{countForCategory(cat.id)}</span>
                </button>
              </Show>
            );
          }}
        </For>

        {/* Add category button */}
        <button
          class="flex items-center justify-center w-7 h-7 rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors cursor-pointer shrink-0"
          onClick={() => setShowCreateDialog(true)}
          title="New category"
        >
          <Plus size={16} />
        </button>
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
      <Show
        when={mangasForGrid().length > 0}
        fallback={
          <div class="flex flex-col items-center justify-center flex-1 gap-4 text-center px-8">
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
  );
}
