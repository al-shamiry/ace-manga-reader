import { createEffect, createSignal, onCleanup, onMount } from "solid-js";
import type { useNavigate } from "@solidjs/router";

import { convertFileSrc } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

import * as api from "~/api";
import type { Chapter, ReaderState } from "~/types";

import type { createFullscreen } from "~/hooks/createFullscreen";
import type { createReaderSettings } from "~/hooks/createReaderSettings";
import { type SlideDir, slideDir } from "~/lib/reader-modes";

import { createContinuousScroll } from "./createContinuousScroll";

/**
 * Page + chapter navigation, page loading/progress, and all the input-driven
 * motion of the reader: paged prev/next (with the slide animation), webtoon
 * scrolling + edge-triggered chapter advance, jump-to-page, keyboard/wheel
 * bindings, and the webtoon container observers. Owns the scroll-container
 * refs; reads display state (reading/fit mode, padding) from `settings`.
 *
 * Scroll-preserving padding adjustment lives here (not in `createReaderSettings`)
 * because it needs the container ref + current page index this hook owns.
 */
export function createReaderNavigation(opts: {
  getState: () => ReaderState | undefined;
  navigate: ReturnType<typeof useNavigate>;
  settings: ReturnType<typeof createReaderSettings>;
  fullscreen: ReturnType<typeof createFullscreen>;
}) {
  const { settings, fullscreen, navigate } = opts;
  const state = opts.getState;

  const [pages, setPages] = createSignal<string[]>([]);
  const [pageIndex, setPageIndex] = createSignal(0);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal("");
  const [jumping, setJumping] = createSignal(false);
  const [jumpInput, setJumpInput] = createSignal("");
  const [webtoonHeight, setWebtoonHeight] = createSignal(0);
  const [anim, setAnim] = createSignal<{
    prevIdx: number;
    dir: SlideDir;
  } | null>(null);

  // Scroll container refs
  let pageContainer: HTMLDivElement | undefined;
  let webtoonContainer: HTMLDivElement | undefined;

  const continuousScroll = createContinuousScroll(() => webtoonContainer);

  // ── Webtoon padding (scroll-preserving) ──────────────────────────
  // Run `apply` while keeping the user's current page + intra-page position
  // visually stable across a webtoon layout change (e.g. side padding).
  // Images are `w-full h-auto`, so changing padding resizes every page and
  // invalidates absolute scrollTop — we restore by ratio within the page.
  function preserveWebtoonScroll(apply: () => void) {
    const el = webtoonContainer;
    if (!el || settings.readingMode() !== "webtoon") {
      apply();
      return;
    }
    const idx = pageIndex();
    const pageEl = el.querySelector(
      `[data-page="${idx}"]`,
    ) as HTMLElement | null;
    if (!pageEl) {
      apply();
      return;
    }
    const prevHeight = pageEl.offsetHeight || 1;
    const offsetWithin = el.scrollTop - pageEl.offsetTop;
    const ratio = offsetWithin / prevHeight;
    apply();
    requestAnimationFrame(() => {
      const newHeight = pageEl.offsetHeight || 1;
      el.scrollTop = pageEl.offsetTop + ratio * newHeight;
    });
  }

  function setWebtoonPaddingPreserving(next: number) {
    if (next === settings.webtoonPadding()) return;
    preserveWebtoonScroll(() => settings.commitWebtoonPadding(next));
  }

  function nudgeWebtoonPadding(delta: number) {
    const next = Math.max(0, Math.min(40, settings.webtoonPadding() + delta));
    setWebtoonPaddingPreserving(next);
  }

  // ── Webtoon scroll + edge advance ────────────────────────────────
  function isAtScrollEdge(dir: "up" | "down"): boolean {
    if (!webtoonContainer) return false;
    if (dir === "up") return webtoonContainer.scrollTop <= 0;
    return (
      webtoonContainer.scrollTop + webtoonContainer.clientHeight >=
      webtoonContainer.scrollHeight - 1
    );
  }

  function webtoonScroll(direction: "up" | "down") {
    if (!webtoonContainer) return;
    if (isAtScrollEdge(direction)) {
      if (direction === "up") goChapter(state()?.prevChapter, "last");
      else goChapter(state()?.nextChapter, 0);
      return;
    }
    const amount = webtoonContainer.clientHeight * 0.7;
    webtoonContainer.scrollBy({
      top: direction === "down" ? amount : -amount,
      behavior: "smooth",
    });
  }

  // ── Chapter loading & progress ───────────────────────────────────
  createEffect(() => {
    const s = state();
    if (!s) return;

    setPages([]);
    setPageIndex(0);
    setLoading(true);
    setError("");
    setJumping(false);

    api.reader
      .openChapter(s.chapter.path, s.chapter.file_type)
      .then((result) => {
        // Compute the initial page once from the chapter load, so webtoon
        // scroll-to-initial doesn't have to re-derive it later from a possibly-
        // stale pageIndex() reading inside a MutationObserver callback.
        let target = 0;
        if (s.initialPage === "last") target = result.length - 1;
        else if (s.initialPage !== undefined) target = s.initialPage;
        else if (s.chapter.status.type === "ongoing")
          target = Math.min(s.chapter.status.page, result.length - 1);

        setPages(result);
        setPageIndex(target);

        // Webtoon scroll-to-initial is handled in initWebtoonRef on mount,
        // so it also runs when cycling modes back into webtoon.
        // Record this chapter open in history (fire-and-forget). Backend overwrites last_read_at.
        api.history
          .recordHistory({
            manga_id: s.manga.id,
            manga_title: s.manga.title,
            manga_path: s.manga.path,
            manga_cover_path: s.manga.cover_path,
            manga_chapter_count: s.manga.chapter_count,
            chapter_id: s.chapter.id,
            chapter_title: s.chapter.title,
            chapter_path: s.chapter.path,
            chapter_file_type: s.chapter.file_type,
            last_read_at: 0,
          })
          .catch(console.error);
      })
      .catch((e) => {
        setError(String(e));
      })
      .finally(() => {
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
      `${s.manga.title} — ${s.chapter.title} — Page ${idx + 1} / ${total}`,
    );

    if (s.chapter.status.type !== "read") {
      api.reader
        .setChapterProgress(s.manga.id, s.chapter.id, idx, total)
        .catch(console.error);
    }
  });

  // Preload neighbouring pages in paged mode
  createEffect(() => {
    if (!settings.isPaged()) return;
    const all = pages();
    const idx = pageIndex();
    if (all.length === 0) return;
    for (let i = idx - 1; i <= idx + 2; i++) {
      if (i < 0 || i >= all.length || i === idx) continue;
      const img = new Image();
      img.src = convertFileSrc(all[i]);
      img.decode?.().catch(() => {});
    }
  });

  // ── Keyboard & wheel handlers ─────────────────────────────────────
  onMount(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Shared keys (all modes)
      switch (e.key) {
        case "m":
          settings.cycleReadingMode();
          return;
        case "F11":
          e.preventDefault();
          fullscreen.toggle();
          return;
        case "Backspace":
        case "Escape":
          navigate(-1);
          return;
      }

      // Webtoon-specific
      if (settings.readingMode() === "webtoon") {
        switch (e.key) {
          case "ArrowUp":
          case "ArrowLeft":
            e.preventDefault();
            if (!e.repeat && isAtScrollEdge("up"))
              goChapter(state()?.prevChapter, "last");
            else continuousScroll.start(-1);
            break;
          case "ArrowDown":
          case "ArrowRight":
            e.preventDefault();
            if (!e.repeat && isAtScrollEdge("down"))
              goChapter(state()?.nextChapter, 0);
            else continuousScroll.start(1);
            break;
        }
        return;
      }

      // Paged-specific
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          logicalPrev()();
          break;
        case "ArrowRight":
          e.preventDefault();
          logicalNext()();
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
          settings.cycleFitMode();
          break;
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.key === "ArrowUp" || e.key === "ArrowLeft")
        continuousScroll.stop(-1);
      if (e.key === "ArrowDown" || e.key === "ArrowRight")
        continuousScroll.stop(1);
    }
    function onPaddingWheel(e: WheelEvent) {
      if (!e.ctrlKey || e.altKey || e.metaKey) return;
      if (settings.readingMode() !== "webtoon") return;
      if (e.deltaY === 0) return;
      e.preventDefault();
      nudgeWebtoonPadding(e.deltaY < 0 ? -1 : 1);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("wheel", onPaddingWheel, { passive: false });
    onCleanup(() => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("wheel", onPaddingWheel);
      continuousScroll.cleanup();
    });
  });

  // ── Chapter & page navigation ────────────────────────────────────
  async function goChapter(
    chapter: Chapter | undefined,
    initialPage: number | "last",
  ) {
    if (!chapter) return;
    const s = state();
    if (!s) return;
    const allChapters = await api.chapters
      .listChapters(s.manga.path)
      .catch(() => [] as Chapter[]);
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

  function prev() {
    if (pageIndex() > 0) {
      if (settings.isPaged())
        setAnim({
          prevIdx: pageIndex(),
          dir: slideDir(settings.readingMode(), "prev"),
        });
      setPageIndex((i) => i - 1);
      pageContainer?.scrollTo(0, 0);
      return;
    }
    goChapter(state()?.prevChapter, "last");
  }

  function next() {
    if (pageIndex() < pages().length - 1) {
      if (settings.isPaged())
        setAnim({
          prevIdx: pageIndex(),
          dir: slideDir(settings.readingMode(), "next"),
        });
      setPageIndex((i) => i + 1);
      pageContainer?.scrollTo(0, 0);
      return;
    }
    goChapter(state()?.nextChapter, 0);
  }

  function clearAnim() {
    setAnim(null);
  }

  // ── Direction-resolved navigation ─────────────────────────────────
  // Maps visual direction to logical direction based on reading mode.
  // In RTL the visual order is reversed relative to chapter order.
  const logicalPrev = () => (settings.isRtl() ? next : prev);
  const logicalNext = () => (settings.isRtl() ? prev : next);
  const visualPrevChapter = () =>
    settings.isRtl() ? state()?.nextChapter : state()?.prevChapter;
  const visualNextChapter = () =>
    settings.isRtl() ? state()?.prevChapter : state()?.nextChapter;

  function tapLeft() {
    logicalPrev()();
  }
  function tapRight() {
    logicalNext()();
  }
  function tapScrollUp() {
    webtoonScroll("up");
  }
  function tapScrollDown() {
    webtoonScroll("down");
  }

  function goFirstChapter() {
    goChapter(visualPrevChapter(), 0);
  }
  function goLastChapter() {
    goChapter(visualNextChapter(), 0);
  }
  function firstChapterDisabled() {
    return !visualPrevChapter();
  }
  function lastChapterDisabled() {
    return !visualNextChapter();
  }

  function navPrev() {
    return settings.isPaged() ? logicalPrev()() : webtoonScroll("up");
  }
  function navNext() {
    return settings.isPaged() ? logicalNext()() : webtoonScroll("down");
  }
  function navPrevDisabled() {
    if (!settings.isPaged()) return false;
    const atEdge = settings.isRtl()
      ? pageIndex() === pages().length - 1
      : pageIndex() === 0;
    return atEdge && !visualPrevChapter();
  }
  function navNextDisabled() {
    if (!settings.isPaged()) return false;
    const atEdge = settings.isRtl()
      ? pageIndex() === 0
      : pageIndex() === pages().length - 1;
    return atEdge && !visualNextChapter();
  }

  // ── Jump to page ─────────────────────────────────────────────────
  function startJump() {
    setJumpInput(String(pageIndex() + 1));
    setJumping(true);
  }
  function submitJump(e: Event) {
    e.preventDefault();
    const n = parseInt(jumpInput(), 10);
    if (!isNaN(n))
      setPageIndex(Math.max(0, Math.min(pages().length - 1, n - 1)));
    setJumping(false);
  }
  function jumpKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") setJumping(false);
    e.stopPropagation();
  }
  function focusJumpInput(el: HTMLInputElement) {
    setTimeout(() => {
      el.focus();
      el.select();
    }, 0);
  }

  // ── Container refs & webtoon observers ────────────────────────────
  function setPageContainer(el: HTMLDivElement) {
    pageContainer = el;
  }

  function initWebtoonRef(el: HTMLDivElement) {
    webtoonContainer = el;

    // Track container height for tap zone sizing
    const ro = new ResizeObserver(() => setWebtoonHeight(el.clientHeight));
    ro.observe(el);
    onCleanup(() => ro.disconnect());

    // Track which page is in view via IntersectionObserver
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = parseInt(
              (entry.target as HTMLElement).dataset.page || "0",
              10,
            );
            setPageIndex(idx);
          }
        }
      },
      { root: el, rootMargin: "-50% 0px", threshold: 0 },
    );
    const mo = new MutationObserver(() => {
      el.querySelectorAll("[data-page]").forEach((img) =>
        observer.observe(img),
      );
    });
    mo.observe(el, { childList: true, subtree: true });
    onCleanup(() => {
      observer.disconnect();
      mo.disconnect();
    });

    scrollToInitialPage(el);
  }

  // Scroll to saved progress or "last" page. Waits for images above the
  // target to load — otherwise scrollIntoView lands on the wrong offset
  // because earlier pages are still 0-height.
  function scrollToInitialPage(el: HTMLDivElement) {
    const target = pageIndex();
    const isLast = state()?.initialPage === "last";
    if (target === 0 && !isLast) return;

    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const imgs = Array.from(
          el.querySelectorAll("img[data-page]"),
        ) as HTMLImageElement[];
        const needed = isLast ? imgs : imgs.slice(0, target + 1);
        const waits = needed.map((img) =>
          img.complete && img.naturalHeight > 0
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                const done = () => resolve();
                img.addEventListener("load", done, { once: true });
                img.addEventListener("error", done, { once: true });
              }),
        );
        Promise.all(waits).then(() => {
          if (webtoonContainer !== el) return;
          if (isLast) {
            el.scrollTop = el.scrollHeight;
            return;
          }
          const targetEl = el.querySelector(
            `[data-page="${target}"]`,
          ) as HTMLImageElement | null;
          if (targetEl) targetEl.scrollIntoView({ behavior: "instant" });
        });
      }),
    );
  }

  const tapZoneStyle = () => ({
    height: `${webtoonHeight()}px`,
    "margin-bottom": `-${webtoonHeight()}px`,
  });

  return {
    pages,
    pageIndex,
    loading,
    error,
    anim,
    clearAnim,
    jumping,
    jumpInput,
    setJumpInput,
    startJump,
    submitJump,
    jumpKeyDown,
    focusJumpInput,
    prev,
    next,
    tapLeft,
    tapRight,
    tapScrollUp,
    tapScrollDown,
    goFirstChapter,
    goLastChapter,
    firstChapterDisabled,
    lastChapterDisabled,
    navPrev,
    navNext,
    navPrevDisabled,
    navNextDisabled,
    setWebtoonPaddingPreserving,
    tapZoneStyle,
    setPageContainer,
    initWebtoonRef,
  };
}
