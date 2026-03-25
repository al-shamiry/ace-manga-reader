import { createSignal, createEffect, createMemo, onMount, onCleanup, Show, Index } from "solid-js";
import { useLocation, useNavigate } from "@solidjs/router";
import { ArrowLeft, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChevronFirst, ChevronLast, Maximize, Maximize2, Minimize2, MoveHorizontal, MoveVertical, ScanEye, Fullscreen, BookOpen, BookOpenCheck, ArrowDownUp, Scroll } from "lucide-solid";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Button } from "../components/Button";
import type { Chapter, Manga, FitMode, ReadingMode, Settings } from "../types";

const FIT_MODES: FitMode[] = ["fit-screen", "fit-width", "fit-height", "original", "stretch"];
const FIT_LABELS: Record<FitMode, string> = {
  "fit-screen": "Fit Screen",
  "fit-width": "Fit Width",
  "fit-height": "Fit Height",
  "original": "Original",
  "stretch": "Stretch",
};
const FIT_CLASSES: Record<FitMode, string> = {
  "fit-screen": "max-h-full max-w-full object-contain",
  "fit-width": "w-full h-auto object-contain",
  "fit-height": "h-full w-auto max-w-none object-contain",
  "original": "max-w-none",
  "stretch": "w-full h-full object-fill",
};

const READING_MODES: ReadingMode[] = ["paged-ltr", "paged-rtl", "paged-vertical", "webtoon"];
const READING_LABELS: Record<ReadingMode, string> = {
  "paged-ltr": "Paged LTR",
  "paged-rtl": "Paged RTL",
  "paged-vertical": "Paged Vertical",
  "webtoon": "Webtoon",
};

interface ReaderState {
  chapter: Chapter;
  manga: Manga;
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
  const [webtoonHeight, setWebtoonHeight] = createSignal(0);
  const [jumpInput, setJumpInput] = createSignal("");
  const [fitMode, setFitMode] = createSignal<FitMode>("fit-screen");
  const [readingMode, setReadingMode] = createSignal<ReadingMode>("paged-ltr");
  const [isFullscreen, setIsFullscreen] = createSignal(false);

  // Load saved settings (manga-specific, with global fallback)
  onMount(() => {
    const s = state();
    if (!s) return;
    invoke<Settings>("get_settings", { mangaId: s.manga.id }).then((settings) => {
      if (settings.fit_mode) setFitMode(settings.fit_mode);
      if (settings.reading_mode) setReadingMode(settings.reading_mode);
    }).catch(() => {});
  });

  function saveSetting(patch: Partial<Settings>) {
    const s = state();
    invoke("set_settings", {
      settings: patch,
      mangaId: s?.manga.id,
    }).catch(console.error);
  }

  function cycleFitMode() {
    const current = fitMode();
    const next = FIT_MODES[(FIT_MODES.indexOf(current) + 1) % FIT_MODES.length];
    setFitMode(next);
    saveSetting({ fit_mode: next });
  }

  function cycleReadingMode() {
    const current = readingMode();
    const next = READING_MODES[(READING_MODES.indexOf(current) + 1) % READING_MODES.length];
    setReadingMode(next);
    saveSetting({ reading_mode: next });
  }

  const isPaged = () => readingMode() !== "webtoon";
  const isVertical = () => readingMode() === "paged-vertical";
  const isRtl = () => readingMode() === "paged-rtl";

  // Scroll container refs
  let pageContainer: HTMLDivElement | undefined;
  let webtoonContainer: HTMLDivElement | undefined;

  function isAtScrollEdge(dir: "up" | "down"): boolean {
    if (!webtoonContainer) return false;
    if (dir === "up") return webtoonContainer.scrollTop <= 0;
    return webtoonContainer.scrollTop + webtoonContainer.clientHeight >= webtoonContainer.scrollHeight - 1;
  }

  function webtoonScroll(direction: "up" | "down") {
    if (!webtoonContainer) return;
    if (isAtScrollEdge(direction)) {
      if (direction === "up") goChapter(state()?.prevChapter, "last");
      else goChapter(state()?.nextChapter, 0);
      return;
    }
    const amount = webtoonContainer.clientHeight * 0.7;
    webtoonContainer.scrollBy({ top: direction === "down" ? amount : -amount, behavior: "smooth" });
  }

  // Continuous keyboard scroll for webtoon mode
  let scrollDir = 0;
  let scrollRaf = 0;
  let lastFrame = 0;
  let scrollStart = 0;
  const SCROLL_SPEED = 3000; // px per second
  const SCROLL_SPEED_FAST = 15000; // px per second after 3s
  const BOOST_AFTER = 2000; // ms

  function scrollLoop(now: number) {
    if (!scrollDir) return;
    if (lastFrame) {
      const dt = (now - lastFrame) / 1000;
      const speed = (now - scrollStart) > BOOST_AFTER ? SCROLL_SPEED_FAST : SCROLL_SPEED;
      webtoonContainer?.scrollBy(0, scrollDir * speed * dt);
    }
    lastFrame = now;
    scrollRaf = requestAnimationFrame(scrollLoop);
  }

  function startContinuousScroll(dir: number) {
    if (scrollDir === dir) return;
    scrollDir = dir;
    lastFrame = 0;
    scrollStart = performance.now();
    scrollRaf = requestAnimationFrame(scrollLoop);
  }

  function stopContinuousScroll(dir: number) {
    if (scrollDir !== dir) return;
    scrollDir = 0;
    cancelAnimationFrame(scrollRaf);
  }

  // Page flip animation
  type SlideDir = "left" | "right" | "up" | "down";
  const [anim, setAnim] = createSignal<{ prevIdx: number; dir: SlideDir } | null>(null);

  function slideDir(action: "prev" | "next"): SlideDir {
    const mode = readingMode();
    if (mode === "paged-vertical") return action === "next" ? "up" : "down";
    if (mode === "paged-rtl") return action === "next" ? "right" : "left";
    return action === "next" ? "left" : "right";
  }

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
      `${s.manga.title} — ${s.chapter.title} — Page ${idx + 1} / ${total}`
    );

    if (s.chapter.status.type !== "read") {
      invoke("set_chapter_progress", {
        mangaId: s.manga.id,
        chapterId: s.chapter.id,
        page: idx,
        totalPages: total,
      }).catch(console.error);
    }
  });

  // Keyboard listeners — synchronous so onCleanup registers correctly
  onMount(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (readingMode() === "webtoon") {
        switch (e.key) {
          case "ArrowUp":
          case "ArrowLeft":
            e.preventDefault();
            if (!e.repeat && isAtScrollEdge("up")) { goChapter(state()?.prevChapter, "last"); }
            else startContinuousScroll(-1);
            break;
          case "ArrowDown":
          case "ArrowRight":
            e.preventDefault();
            if (!e.repeat && isAtScrollEdge("down")) { goChapter(state()?.nextChapter, 0); }
            else startContinuousScroll(1);
            break;
          case "m": cycleReadingMode(); break;
          case "F11": e.preventDefault(); toggleFullscreen(); break;
          case "Backspace":
          case "Escape": navigate(-1); break;
        }
        return;
      }
      const rtl = isRtl();
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          rtl ? next() : prev();
          break;
        case "ArrowRight":
          e.preventDefault();
          rtl ? prev() : next();
          break;
        case "ArrowUp":
          e.preventDefault();
          prev();
          break;
        case "ArrowDown":
          e.preventDefault();
          next();
          break;
        case "f":
          cycleFitMode();
          break;
        case "m":
          cycleReadingMode();
          break;
        case "F11":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "Backspace":
        case "Escape":
          navigate(-1);
          break;
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") stopContinuousScroll(-1);
      if (e.key === "ArrowDown" || e.key === "ArrowRight") stopContinuousScroll(1);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    onCleanup(() => { window.removeEventListener("keydown", onKeyDown); window.removeEventListener("keyup", onKeyUp); cancelAnimationFrame(scrollRaf); });
  });

  async function goChapter(chapter: Chapter | undefined, initialPage: number | "last") {
    if (!chapter) return;
    const s = state();
    if (!s) return;
    const allChapters = await invoke<Chapter[]>("get_chapters", {
      mangaPath: s.manga.path,
    }).catch(() => [] as Chapter[]);
    const idx = allChapters.findIndex((c) => c.id === chapter.id);

    navigate("/reader/" + chapter.id, {
      state: {
        chapter,
        manga: s.manga,
        prevChapter: allChapters[idx - 1],
        nextChapter: allChapters[idx + 1],
        initialPage,
      },
      replace: true,
    });
  }

  async function prev() {
    if (pageIndex() > 0) {
      if (isPaged()) setAnim({ prevIdx: pageIndex(), dir: slideDir("prev") });
      setPageIndex((i) => i - 1);
      pageContainer?.scrollTo(0, 0);
      return;
    }
    goChapter(state()?.prevChapter, "last");
  }

  async function next() {
    if (pageIndex() < pages().length - 1) {
      if (isPaged()) setAnim({ prevIdx: pageIndex(), dir: slideDir("next") });
      setPageIndex((i) => i + 1);
      pageContainer?.scrollTo(0, 0);
      return;
    }
    goChapter(state()?.nextChapter, 0);
  }

  function goBack() {
    if (isFullscreen()) getCurrentWindow().setFullscreen(false);
    navigate(-1);
  }

  async function toggleFullscreen() {
    const win = getCurrentWindow();
    const full = await win.isFullscreen();
    await win.setFullscreen(!full);
    setIsFullscreen(!full);
  }

  function initWebtoonRef(el: HTMLDivElement) {
    webtoonContainer = el;
    const ro = new ResizeObserver(() => setWebtoonHeight(el.clientHeight));
    ro.observe(el);
    onCleanup(() => ro.disconnect());
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = parseInt((entry.target as HTMLElement).dataset.page || "0", 10);
            setPageIndex(idx);
          }
        }
      },
      { root: el, rootMargin: "-50% 0px", threshold: 0 }
    );
    let scrolledToInitial = false;
    const mo = new MutationObserver(() => {
      el.querySelectorAll("[data-page]").forEach((img) => observer.observe(img));
      if (!scrolledToInitial) {
        const idx = pageIndex();
        const target = el.querySelector(`[data-page="${idx}"]`) as HTMLImageElement | null;
        if (target) {
          if (state()?.initialPage === "last") {
            const scrollToEnd = () => { el.scrollTop = el.scrollHeight; };
            if (target.complete) scrollToEnd();
            else target.addEventListener("load", scrollToEnd, { once: true });
          } else {
            target.scrollIntoView({ behavior: "instant" });
          }
          scrolledToInitial = true;
        }
      }
    });
    mo.observe(el, { childList: true, subtree: true });
    onCleanup(() => { observer.disconnect(); mo.disconnect(); });
  }

  function tapScrollUp() { webtoonScroll("up"); }
  function tapScrollDown() { webtoonScroll("down"); }

  function pageContainerClass() {
    if (anim()) return `absolute inset-0 flex items-center justify-center overflow-hidden slide-in-${anim()!.dir}`;
    const fm = fitMode();
    const overflow = fm === "original" || fm === "fit-width" || fm === "fit-height" ? "overflow-auto" : "overflow-hidden";
    return `absolute inset-0 flex items-center justify-center ${overflow}`;
  }

  function clearAnim() { setAnim(null); }

  function tapLeft() { (isRtl() ? next : prev)(); }
  function tapRight() { (isRtl() ? prev : next)(); }

  function goFirstChapter() { goChapter(isRtl() ? state()?.nextChapter : state()?.prevChapter, 0); }
  function goLastChapter() { goChapter(isRtl() ? state()?.prevChapter : state()?.nextChapter, 0); }
  function firstChapterDisabled() { return isRtl() ? !state()?.nextChapter : !state()?.prevChapter; }
  function lastChapterDisabled() { return isRtl() ? !state()?.prevChapter : !state()?.nextChapter; }

  function navPrev() { return isPaged() ? (isRtl() ? next : prev)() : webtoonScroll("up"); }
  function navNext() { return isPaged() ? (isRtl() ? prev : next)() : webtoonScroll("down"); }
  function navPrevDisabled() { return isPaged() && (isRtl() ? pageIndex() === pages().length - 1 && !state()?.nextChapter : pageIndex() === 0 && !state()?.prevChapter); }
  function navNextDisabled() { return isPaged() && (isRtl() ? pageIndex() === 0 && !state()?.prevChapter : pageIndex() === pages().length - 1 && !state()?.nextChapter); }

  function startJump() { setJumpInput(String(pageIndex() + 1)); setJumping(true); }
  function submitJump(e: Event) {
    e.preventDefault();
    const n = parseInt(jumpInput(), 10);
    if (!isNaN(n)) setPageIndex(Math.max(0, Math.min(pages().length - 1, n - 1)));
    setJumping(false);
  }
  function jumpKeyDown(e: KeyboardEvent) { if (e.key === "Escape") setJumping(false); e.stopPropagation(); }
  function focusJumpInput(el: HTMLInputElement) { setTimeout(() => { el.focus(); el.select(); }, 0); }

  const tapZoneStyle = () => ({ height: `${webtoonHeight()}px`, "margin-bottom": `-${webtoonHeight()}px` });

  return (
    <Show
      when={state()}
      fallback={
        <div class="flex flex-col items-center justify-center flex-1 gap-4 text-zinc-500">
          <p class="text-sm">No chapter data — navigate here from the chapter list.</p>
          <Button variant="ghost" onClick={goBack}>
            <ArrowLeft size={14} /> Back
          </Button>
        </div>
      }
    >
      {(s) => (
        <div class="flex flex-col flex-1 overflow-hidden bg-black">
          {/* Toolbar */}
          <div class="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 shrink-0">
            <Button variant="ghost" onClick={goBack}>
              <ArrowLeft size={14} />
              Back
            </Button>
            <span class="flex-1 text-sm font-semibold text-zinc-100 truncate">
              {s().manga.title} — {s().chapter.title}
            </span>
            <Button variant="ghost" onClick={cycleReadingMode} title={READING_LABELS[readingMode()]}>
              {readingMode() === "paged-ltr" && <BookOpen size={14} />}
              {readingMode() === "paged-rtl" && <BookOpenCheck size={14} />}
              {readingMode() === "paged-vertical" && <ArrowDownUp size={14} />}
              {readingMode() === "webtoon" && <Scroll size={14} />}
              <span class="text-xs">{READING_LABELS[readingMode()]}</span>
            </Button>
            <Show when={isPaged()}>
              <Button variant="ghost" onClick={cycleFitMode} title={FIT_LABELS[fitMode()]}>
                {fitMode() === "fit-screen" && <Maximize size={14} />}
                {fitMode() === "fit-width" && <MoveHorizontal size={14} />}
                {fitMode() === "fit-height" && <MoveVertical size={14} />}
                {fitMode() === "original" && <ScanEye size={14} />}
                {fitMode() === "stretch" && <Fullscreen size={14} />}
                <span class="text-xs">{FIT_LABELS[fitMode()]}</span>
              </Button>
            </Show>
            <Button variant="ghost" iconOnly onClick={toggleFullscreen} title="Fullscreen (F11)">
              {isFullscreen() ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </Button>
          </div>

          {/* Page area */}
          <Show when={loading()}>
            <div class="flex-1 flex items-center justify-center">
              <div class="text-zinc-500 text-sm">Loading pages…</div>
            </div>
          </Show>

          <Show when={error()}>
            <div class="flex-1 flex items-center justify-center">
              <p class="text-red-400 text-sm">{error()}</p>
            </div>
          </Show>

          <Show when={!loading() && !error() && pages().length > 0}>
            {/* Webtoon mode — continuous scroll */}
            <Show when={readingMode() === "webtoon"}>
              <div class="flex-1 relative">
              <div
                class="absolute inset-0 overflow-y-auto"
                ref={initWebtoonRef}
              >
                {/* Tap zones — sticky inside scroll container to respect scrollbars */}
                <div class="sticky top-0 flex flex-col pointer-events-none z-10" style={tapZoneStyle()}>
                  <div class="w-full h-1/3 pointer-events-auto cursor-up" onClick={tapScrollUp} />
                  <div class="w-full h-1/3" />
                  <div class="w-full h-1/3 pointer-events-auto cursor-down" onClick={tapScrollDown} />
                </div>
                <div class="flex flex-col items-center">
                  <Index each={pages()}>
                    {(page, idx) => (
                      <img
                        src={convertFileSrc(page())}
                        alt={`Page ${idx + 1}`}
                        data-page={idx}
                        class="w-full h-auto select-none"
                        draggable={false}
                      />
                    )}
                  </Index>
                </div>
              </div>
              </div>
            </Show>

            {/* Paged modes — single image with tap zones */}
            <Show when={isPaged()}>
              <div class="flex-1 relative overflow-hidden">
                {/* Outgoing page (only during animation) */}
                <Show when={anim()}>
                  {(a) => (
                    <div class={`absolute inset-0 flex items-center justify-center overflow-hidden slide-out-${a().dir}`}>
                      <img
                        src={convertFileSrc(pages()[a().prevIdx])}
                        alt="Previous page"
                        class={`select-none ${FIT_CLASSES[fitMode()]}`}
                        draggable={false}
                      />
                    </div>
                  )}
                </Show>
                {/* Current page */}
                <div
                  ref={pageContainer}
                  class={pageContainerClass()}
                  onAnimationEnd={clearAnim}
                >
                  <img
                    src={convertFileSrc(pages()[pageIndex()])}
                    alt={`Page ${pageIndex() + 1}`}
                    class={`select-none ${FIT_CLASSES[fitMode()]}`}
                    draggable={false}
                  />
                </div>
                {/* Tap zones — direction depends on mode */}
                <Show when={isVertical()} fallback={
                  /* Horizontal tap zones (LTR / RTL) */
                  <div class="absolute inset-0 flex pointer-events-none z-10">
                    <div class="w-1/3 h-full pointer-events-auto cursor-left" onClick={tapLeft} />
                    <div class="w-1/3 h-full" />
                    <div class="w-1/3 h-full pointer-events-auto cursor-right" onClick={tapRight} />
                  </div>
                }>
                  {/* Vertical tap zones */}
                  <div class="absolute inset-0 flex flex-col pointer-events-none z-10">
                    <div class="w-full h-1/3 pointer-events-auto cursor-up" onClick={prev} />
                    <div class="w-full h-1/3" />
                    <div class="w-full h-1/3 pointer-events-auto cursor-down" onClick={next} />
                  </div>
                </Show>
              </div>
            </Show>
          </Show>

          {/* Bottom nav */}
          <div class="flex items-center justify-center gap-4 px-4 py-2.5 bg-zinc-900 border-t border-zinc-800 shrink-0">
            <Button variant="ghost" iconOnly onClick={goFirstChapter} disabled={firstChapterDisabled()} title={isRtl() ? "Next chapter" : "Previous chapter"}>
              <ChevronFirst size={16} />
            </Button>
            <Button variant="ghost" iconOnly onClick={navPrev} disabled={navPrevDisabled()}>
              {isVertical() || !isPaged() ? <ChevronUp size={16} /> : <ChevronLeft size={16} />}
            </Button>
            <Show
              when={jumping()}
              fallback={
                <button
                  class="text-sm text-zinc-400 tabular-nums hover:text-zinc-100 transition-colors cursor-pointer px-2 py-1 rounded hover:bg-zinc-800"
                  onClick={startJump}
                >
                  {pageIndex() + 1} / {pages().length}
                </button>
              }
            >
              <form
                class="flex items-center gap-1.5"
                onSubmit={submitJump}
              >
                <input
                  type="number"
                  min={1}
                  max={pages().length}
                  value={jumpInput()}
                  onInput={(e) => setJumpInput(e.currentTarget.value)}
                  onKeyDown={jumpKeyDown}
                  ref={focusJumpInput}
                  class="w-14 text-center text-sm bg-zinc-800 text-zinc-100 rounded px-1.5 py-0.5 outline-none border border-zinc-600 focus:border-indigo-500 tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span class="text-sm text-zinc-500">/ {pages().length}</span>
              </form>
            </Show>
            <Button variant="ghost" iconOnly onClick={navNext} disabled={navNextDisabled()}>
              {isVertical() || !isPaged() ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </Button>
            <Button variant="ghost" iconOnly onClick={goLastChapter} disabled={lastChapterDisabled()} title={isRtl() ? "Previous chapter" : "Next chapter"}>
              <ChevronLast size={16} />
            </Button>
          </div>
        </div>
      )}
    </Show>
  );
}
