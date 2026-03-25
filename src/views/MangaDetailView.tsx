import { For, Show, createSignal, onMount } from "solid-js";
import { useNavigate, useLocation } from "@solidjs/router";
import { ArrowLeft, BookOpen, Play } from "lucide-solid";
import { invoke } from "@tauri-apps/api/core";
import { convertFileSrc } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Button } from "../components/Button";
import { ChapterListSkeleton } from "../components/Skeleton";
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

  const [chapters, setChapters] = createSignal<Chapter[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal("");

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
        </div>
      </div>

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
