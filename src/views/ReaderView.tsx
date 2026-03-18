import { createSignal, createEffect, createMemo, onMount, onCleanup, Show } from "solid-js";
import { useLocation, useNavigate } from "@solidjs/router";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-solid";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Button } from "../components/Button";
import type { Chapter, Comic } from "../types";

interface ReaderState {
  chapter: Chapter;
  comic: Comic;
  prevChapter?: Chapter;
  nextChapter?: Chapter;
  initialPage?: number | "last";
}

export function ReaderView() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = createMemo(() => location.state as ReaderState | undefined);

  const [pages, setPages] = createSignal<string[]>([]);
  const [pageIndex, setPageIndex] = createSignal(0);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal("");
  const [jumping, setJumping] = createSignal(false);
  const [jumpInput, setJumpInput] = createSignal("");

  // Reload whenever the chapter changes
  createEffect(() => {
    const s = state();
    if (!s) return;

    setPages([]);
    setPageIndex(0);
    setLoading(true);
    setError("");
    setJumping(false);

    invoke<string[]>("open_chapter", {
      chapterPath: s.chapter.path,
      fileType: s.chapter.file_type,
    }).then((result) => {
      setPages(result);
      if (s.initialPage === "last") {
        setPageIndex(result.length - 1);
      } else if (s.initialPage !== undefined) {
        setPageIndex(s.initialPage);
      } else if (s.chapter.status.type === "ongoing") {
        setPageIndex(Math.min(s.chapter.status.page, result.length - 1));
      }
    }).catch((e) => {
      setError(String(e));
    }).finally(() => {
      setLoading(false);
    });
  });

  // Update window title and save progress on every page turn
  createEffect(() => {
    const total = pages().length;
    const s = state();
    if (!s || total === 0) return;
    const idx = pageIndex();

    getCurrentWindow().setTitle(
      `${s.comic.title} — ${s.chapter.title} — Page ${idx + 1} / ${total}`
    );

    if (s.chapter.status.type !== "read") {
      invoke("set_chapter_progress", {
        mangaId: s.comic.id,
        chapterId: s.chapter.id,
        page: idx,
        totalPages: total,
      }).catch(console.error);
    }
  });

  // Keyboard listeners — synchronous so onCleanup registers correctly
  onMount(() => {
    function onKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case "ArrowLeft":
        case "ArrowUp":
          e.preventDefault();
          prev();
          break;
        case "ArrowRight":
        case "ArrowDown":
          e.preventDefault();
          next();
          break;
        case "Backspace":
        case "Escape":
          navigate(-1);
          break;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    onCleanup(() => window.removeEventListener("keydown", onKeyDown));
  });

  async function prev() {
    if (pageIndex() > 0) {
      setPageIndex((i) => i - 1);
      return;
    }
    const s = state();
    if (!s?.prevChapter) return;
    const { prevChapter, comic } = s;

    const allChapters = await invoke<Chapter[]>("get_chapters", {
      mangaPath: comic.path,
    }).catch(() => [] as Chapter[]);
    const idx = allChapters.findIndex((c) => c.id === prevChapter.id);

    navigate("/reader/" + prevChapter.id, {
      state: {
        chapter: prevChapter,
        comic,
        prevChapter: allChapters[idx - 1],
        nextChapter: allChapters[idx + 1],
        initialPage: "last",
      },
      replace: true,
    });
  }

  async function next() {
    if (pageIndex() < pages().length - 1) {
      setPageIndex((i) => i + 1);
      return;
    }
    const s = state();
    if (!s?.nextChapter) return;
    const { nextChapter, comic } = s;

    const allChapters = await invoke<Chapter[]>("get_chapters", {
      mangaPath: comic.path,
    }).catch(() => [] as Chapter[]);
    const idx = allChapters.findIndex((c) => c.id === nextChapter.id);

    navigate("/reader/" + nextChapter.id, {
      state: {
        chapter: nextChapter,
        comic,
        prevChapter: allChapters[idx - 1],
        nextChapter: allChapters[idx + 1],
        initialPage: 0,
      },
      replace: true,
    });
  }

  return (
    <Show
      when={state()}
      fallback={
        <div class="flex flex-col items-center justify-center flex-1 gap-4 text-zinc-500">
          <p class="text-sm">No chapter data — navigate here from the chapter list.</p>
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft size={14} /> Back
          </Button>
        </div>
      }
    >
      {(s) => (
        <div class="flex flex-col flex-1 overflow-hidden bg-black">
          {/* Toolbar */}
          <div class="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 shrink-0">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft size={14} />
              Back
            </Button>
            <span class="flex-1 text-sm font-semibold text-zinc-100 truncate">
              {s().comic.title} — {s().chapter.title}
            </span>
          </div>

          {/* Page area */}
          <div class="flex-1 flex items-center justify-center overflow-hidden relative">
            <Show when={loading()}>
              <div class="text-zinc-500 text-sm">Loading pages…</div>
            </Show>

            <Show when={error()}>
              <p class="text-red-400 text-sm">{error()}</p>
            </Show>

            <Show when={!loading() && !error() && pages().length > 0}>
              <img
                src={convertFileSrc(pages()[pageIndex()])}
                alt={`Page ${pageIndex() + 1}`}
                class="max-h-full max-w-full object-contain select-none"
                draggable={false}
              />
              {/* Tap zones */}
              <div class="absolute inset-0 flex pointer-events-none">
                <div class="w-1/3 h-full pointer-events-auto cursor-pointer" onClick={prev} />
                <div class="w-1/3 h-full" />
                <div class="w-1/3 h-full pointer-events-auto cursor-pointer" onClick={next} />
              </div>
            </Show>
          </div>

          {/* Bottom nav */}
          <div class="flex items-center justify-center gap-4 px-4 py-2.5 bg-zinc-900 border-t border-zinc-800 shrink-0">
            <Button variant="ghost" iconOnly onClick={prev} disabled={pageIndex() === 0 && !s().prevChapter}>
              <ChevronLeft size={16} />
            </Button>
            <Show
              when={jumping()}
              fallback={
                <button
                  class="text-sm text-zinc-400 tabular-nums hover:text-zinc-100 transition-colors cursor-pointer px-2 py-1 rounded hover:bg-zinc-800"
                  onClick={() => { setJumpInput(String(pageIndex() + 1)); setJumping(true); }}
                >
                  {pageIndex() + 1} / {pages().length}
                </button>
              }
            >
              <form
                class="flex items-center gap-1.5"
                onSubmit={(e) => {
                  e.preventDefault();
                  const n = parseInt(jumpInput(), 10);
                  if (!isNaN(n)) setPageIndex(Math.max(0, Math.min(pages().length - 1, n - 1)));
                  setJumping(false);
                }}
              >
                <input
                  type="number"
                  min={1}
                  max={pages().length}
                  value={jumpInput()}
                  onInput={(e) => setJumpInput(e.currentTarget.value)}
                  onKeyDown={(e) => { if (e.key === "Escape") setJumping(false); e.stopPropagation(); }}
                  ref={(el) => setTimeout(() => { el.focus(); el.select(); }, 0)}
                  class="w-14 text-center text-sm bg-zinc-800 text-zinc-100 rounded px-1.5 py-0.5 outline-none border border-zinc-600 focus:border-indigo-500 tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span class="text-sm text-zinc-500">/ {pages().length}</span>
              </form>
            </Show>
            <Button variant="ghost" iconOnly onClick={next} disabled={pageIndex() === pages().length - 1 && !s().nextChapter}>
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}
    </Show>
  );
}
