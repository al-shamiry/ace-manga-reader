import { For, Show, createSignal, onMount } from "solid-js";
import { useNavigate, useLocation } from "@solidjs/router";
import { ArrowLeft, BookOpen, Play, Bookmark, Check } from "lucide-solid";
import { invoke } from "@tauri-apps/api/core";
import { convertFileSrc } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Button } from "../components/Button";
import { ChapterListSkeleton } from "../components/Skeleton";
import { useLibrary } from "../context/LibraryContext";
import type { Manga, Chapter, ChapterStatus } from "../types";

function StatusBadge(props: { status: ChapterStatus }) {
  switch (props.status.type) {
    case "read":
      return (
        <span class="text-[0.65rem] font-semibold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
          Done
        </span>
      );
    case "ongoing":
      if (props.status.page === 0) {
        return (
          <span class="text-[0.65rem] font-semibold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-100">
            New
          </span>
        );
      }
      return (
        <span class="text-[0.65rem] font-semibold px-1.5 py-0.5 rounded bg-indigo-900/50 text-indigo-400">
          Page {props.status.page + 1}
        </span>
      );
    default:
      return (
        <span class="text-[0.65rem] font-semibold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-100">
          New
        </span>
      );
  }
}

export function MangaDetailView() {
  const navigate = useNavigate();
  const location = useLocation();
  const manga = location.state as Manga | undefined;
  const { categories, libraryEntries, refreshLibrary, refreshCategories } = useLibrary();

  const [chapters, setChapters] = createSignal<Chapter[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal("");
  const [showCategoryPicker, setShowCategoryPicker] = createSignal(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = createSignal<string[]>([]);

  onMount(async () => {
    if (!manga) return;
    getCurrentWindow().setTitle(`Ace Manga Reader — ${manga.title}`);
    try {
      const result = await invoke<Chapter[]>("get_chapters", {
        mangaPath: manga.path,
      });
      setChapters(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
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

  const libraryEntry = () => libraryEntries().find((e) => e.manga_id === manga?.id);
  const isInLibrary = () => !!libraryEntry();

  async function handleAddToLibrary() {
    if (!manga) return;
    const cats = categories();
    // Already in library → always open picker (to edit categories or remove)
    if (isInLibrary()) {
      setSelectedCategoryIds(libraryEntry()!.category_ids);
      await refreshCategories();
      setShowCategoryPicker(true);
      return;
    }
    // Quick action: only one category → add directly
    if (cats.length === 1) {
      await invoke("add_to_library", {
        mangaId: manga.id,
        title: manga.title,
        path: manga.path,
        coverPath: manga.cover_path,
        chapterCount: manga.chapter_count,
        categoryIds: [cats[0].id],
      });
      await refreshLibrary();
      return;
    }
    // Multiple categories → open picker
    setSelectedCategoryIds([cats[0].id]);
    await refreshCategories();
    setShowCategoryPicker(true);
  }

  function toggleCategory(catId: string) {
    const current = selectedCategoryIds();
    if (current.includes(catId)) {
      // Don't allow deselecting all
      if (current.length > 1) {
        setSelectedCategoryIds(current.filter((id) => id !== catId));
      }
    } else {
      setSelectedCategoryIds([...current, catId]);
    }
  }

  async function confirmCategoryPicker() {
    if (!manga) return;
    await invoke("add_to_library", {
      mangaId: manga.id,
      title: manga.title,
      path: manga.path,
      coverPath: manga.cover_path,
      chapterCount: manga.chapter_count,
      categoryIds: selectedCategoryIds(),
    });
    setShowCategoryPicker(false);
    await refreshLibrary();
  }

  async function handleRemoveFromLibrary() {
    if (!manga) return;
    await invoke("remove_from_library", { mangaId: manga.id });
    setShowCategoryPicker(false);
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

  if (!manga) {
    return (
      <div class="flex flex-col items-center justify-center flex-1 gap-4 text-zinc-500">
        <p class="text-sm">No manga data — navigate here from the library.</p>
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} /> Back
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Toolbar */}
      <div class="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} />
          Back
        </Button>
      </div>

      {/* Header */}
      <div class="flex gap-4 p-4 border-b border-zinc-800 shrink-0">
        <img
          src={convertFileSrc(manga.cover_path)}
          alt={manga.title}
          class="w-24 rounded-lg object-cover shrink-0 bg-zinc-800"
        />
        <div class="flex flex-col gap-2 flex-1 min-w-0 justify-center">
          <h1 class="text-base font-bold text-zinc-100 leading-snug">
            {manga.title}
          </h1>
          <p class="text-xs text-zinc-500">
            {manga.chapter_count} {manga.chapter_count === 1 ? "chapter" : "chapters"}
          </p>
          <div class="flex items-center gap-2">
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
            <Button
              variant={isInLibrary() ? "primary" : "ghost"}
              onClick={handleAddToLibrary}
              title={isInLibrary() ? "Edit library categories" : "Add to library"}
            >
              <Bookmark size={14} fill={isInLibrary() ? "currentColor" : "none"} />
              {isInLibrary() ? "In Library" : "Add to Library"}
            </Button>
          </div>
        </div>
      </div>

      {/* Category picker dialog */}
      <Show when={showCategoryPicker()}>
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowCategoryPicker(false)}>
          <div class="bg-zinc-900 border border-zinc-700 rounded-xl p-5 w-80 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 class="text-sm font-semibold text-zinc-100 mb-3">
              {isInLibrary() ? "Edit Categories" : "Add to Library"}
            </h3>
            <div class="flex flex-col gap-1 max-h-60 overflow-y-auto">
              <For each={categories()}>
                {(cat) => (
                  <button
                    class="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors cursor-pointer hover:bg-zinc-800"
                    classList={{
                      "text-zinc-100": selectedCategoryIds().includes(cat.id),
                      "text-zinc-400": !selectedCategoryIds().includes(cat.id),
                    }}
                    onClick={() => toggleCategory(cat.id)}
                  >
                    <div
                      class="w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors"
                      classList={{
                        "bg-indigo-600 border-indigo-600": selectedCategoryIds().includes(cat.id),
                        "border-zinc-600": !selectedCategoryIds().includes(cat.id),
                      }}
                    >
                      <Show when={selectedCategoryIds().includes(cat.id)}>
                        <Check size={12} stroke-width={3} />
                      </Show>
                    </div>
                    {cat.name}
                  </button>
                )}
              </For>
            </div>
            <div class="flex justify-between mt-4">
              <Show when={isInLibrary()}>
                <button
                  class="px-3 py-1.5 rounded-md text-sm text-red-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                  onClick={handleRemoveFromLibrary}
                >
                  Remove
                </button>
              </Show>
              <div class="flex gap-2 ml-auto">
                <button
                  class="px-3 py-1.5 rounded-md text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
                  onClick={() => setShowCategoryPicker(false)}
                >
                  Cancel
                </button>
                <button
                  class="px-3 py-1.5 rounded-md text-sm bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
                  onClick={confirmCategoryPicker}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      </Show>

      {/* Chapter count */}
      <div class="px-4 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-800 shrink-0">
        <Show when={!loading()} fallback="…">
          {chapters().length} {chapters().length === 1 ? "chapter" : "chapters"}
        </Show>
      </div>

      {/* Chapter list */}
      <div class="overflow-y-auto flex-1">
        <Show when={loading()}>
          <ChapterListSkeleton />
        </Show>

        <Show when={error()}>
          <p class="px-4 py-3 text-sm text-red-400">{error()}</p>
        </Show>

        <Show when={!loading() && chapters().length === 0 && !error()}>
          <div class="flex flex-col items-center justify-center flex-1 gap-4 py-16 text-center px-8">
            <div class="p-5 bg-zinc-900 rounded-2xl text-zinc-600">
              <BookOpen size={48} stroke-width={1} />
            </div>
            <p class="text-zinc-500 text-sm">No chapters found</p>
          </div>
        </Show>

        <For each={chapters()}>
          {(chapter) => (
            <button
              class="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/60 transition-colors border-b border-zinc-800/50 text-left"
              onClick={() => openChapter(chapter)}
            >
              <span class="flex-1 text-sm text-zinc-200 truncate">
                {chapter.title}
              </span>
              <span class="text-xs text-zinc-600 shrink-0 mr-2">
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
