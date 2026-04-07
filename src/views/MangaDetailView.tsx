import { For, Show, createSignal, onMount } from "solid-js";
import { useNavigate, useLocation } from "@solidjs/router";
import { ArrowLeft, Play, Bookmark, Trash2 } from "lucide-solid";
import { invoke } from "@tauri-apps/api/core";
import { convertFileSrc } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Button } from "../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "../components/ui/dropdown-menu";
import { useLibrary } from "../context/LibraryContext";
import { useViewLoading } from "../context/ViewLoadingContext";
import { EmptyState } from "../components/EmptyState";
import type { Manga, Chapter, ChapterStatus } from "../types";

function StatusBadge(props: { status: ChapterStatus }) {
  switch (props.status.type) {
    case "read":
      return (
        <span class="text-[0.65rem] font-semibold px-1.5 py-0.5 rounded bg-ink-800 text-ink-500">
          Done
        </span>
      );
    case "ongoing":
      if (props.status.page === 0) {
        return (
          <span class="text-[0.65rem] font-semibold px-1.5 py-0.5 rounded bg-ink-800 text-ink-100">
            New
          </span>
        );
      }
      return (
        <span class="text-[0.65rem] font-semibold px-1.5 py-0.5 rounded bg-jade-900/50 text-jade-400">
          Page {props.status.page + 1}
        </span>
      );
    default:
      return (
        <span class="text-[0.65rem] font-semibold px-1.5 py-0.5 rounded bg-ink-800 text-ink-100">
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
  const view = useViewLoading();
  // Mark busy synchronously so the overlay paints on the first frame.
  // The "no manga" branch below short-circuits to ready() in onMount.
  const loadToken = view.busy();

  const [chapters, setChapters] = createSignal<Chapter[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal("");

  onMount(async () => {
    if (!manga) {
      view.ready(loadToken);
      return;
    }
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

  const libraryEntry = () => libraryEntries().find((e) => e.manga_id === manga?.id);
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
        title: manga.title,
        path: manga.path,
        coverPath: manga.cover_path,
        chapterCount: manga.chapter_count,
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

  if (!manga) {
    return (
      <div class="flex flex-col items-center justify-center flex-1 gap-4 text-ink-500">
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
      <div class="flex items-center gap-2 px-4 py-2.5 bg-ink-900 border-b border-ink-800 shrink-0">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} />
          Back
        </Button>
      </div>

      {/* Header */}
      <div class="flex gap-5 p-5 border-b border-ink-800 shrink-0">
        <img
          src={convertFileSrc(manga.cover_path)}
          alt={manga.title}
          class="w-28 rounded-lg object-cover shrink-0 bg-ink-800 shadow-lg shadow-black/40"
        />
        <div class="flex flex-col gap-3 flex-1 min-w-0 justify-center">
          <h1 class="font-display text-display text-ink-100 line-clamp-2">
            {manga.title}
          </h1>
          <p class="text-xs uppercase tracking-wider text-ink-500 font-medium">
            {manga.chapter_count} {manga.chapter_count === 1 ? "chapter" : "chapters"}
          </p>
          <div class="flex items-center gap-2 mt-1">
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
                title={isInLibrary() ? "Edit library categories" : "Add to library"}
              >
                <Bookmark size={14} fill={isInLibrary() ? "currentColor" : "none"} />
                {isInLibrary() ? "In Library" : "Add to Library"}
              </DropdownMenuTrigger>
              <DropdownMenuContent class="w-56">
                <div class="px-2 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-ink-500">
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
      <div class="px-4 py-2 text-xs font-semibold text-ink-500 uppercase tracking-wider border-b border-ink-800 shrink-0">
        <Show when={!loading()} fallback="…">
          {chapters().length} {chapters().length === 1 ? "chapter" : "chapters"}
        </Show>
      </div>

      {/* Chapter list */}
      <div class="overflow-y-auto flex-1">
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
                (each with images inside) or <span class="font-mono text-ink-300">.cbz</span> archives.
                Check the folder contents and try refreshing.
              </>
            }
          />
        </Show>

        <For each={chapters()}>
          {(chapter) => (
            <button
              class="w-full flex items-center gap-3 px-4 py-3 hover:bg-ink-800/60 transition-colors border-b border-ink-800/50 text-left"
              onClick={() => openChapter(chapter)}
            >
              <span class="flex-1 text-sm text-ink-200 truncate">
                {chapter.title}
              </span>
              <span class="text-xs text-ink-600 shrink-0 mr-2">
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
