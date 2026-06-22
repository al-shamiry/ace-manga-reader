import { createSignal, onMount } from "solid-js";

import * as api from "~/api";
import type { FitMode, ReadingMode, Settings } from "~/types";

import { cycle, FIT_MODES, READING_MODES } from "~/lib/reader-modes";

/**
 * Reader display settings (fit mode, reading mode, webtoon side padding) with
 * per-manga persistence. Loads the saved values on mount (manga-specific, with
 * the global default as fallback) and writes each change back via
 * `set_manga_reader_settings`. The `isPaged`/`isVertical`/`isRtl` derivations
 * are exposed here since they're pure reads of `readingMode`.
 *
 * Padding is committed raw (`commitWebtoonPadding`); scroll-preserving padding
 * adjustment lives in `createReaderNavigation` where the container ref + page
 * index are owned.
 */
export function createReaderSettings(opts: {
  mangaId: () => string | undefined;
}) {
  const [fitMode, setFitMode] = createSignal<FitMode>("fit-screen");
  const [readingMode, setReadingMode] = createSignal<ReadingMode>("paged-ltr");
  const [webtoonPadding, setWebtoonPadding] = createSignal(0);

  onMount(() => {
    const id = opts.mangaId();
    if (!id) return;
    api.reader
      .getMangaReaderSettings(id)
      .then((settings) => {
        if (settings.fit_mode) setFitMode(settings.fit_mode);
        if (settings.reading_mode) setReadingMode(settings.reading_mode);
        if (settings.webtoon_padding !== undefined)
          setWebtoonPadding(settings.webtoon_padding);
      })
      .catch(() => {});
  });

  function saveSetting(patch: Partial<Settings>) {
    const id = opts.mangaId();
    if (!id) return;
    api.reader.setMangaReaderSettings(id, patch).catch(console.error);
  }

  function cycleFitMode() {
    const next = cycle(FIT_MODES, fitMode());
    setFitMode(next);
    saveSetting({ fit_mode: next });
  }

  function cycleReadingMode() {
    const next = cycle(READING_MODES, readingMode());
    setReadingMode(next);
    saveSetting({ reading_mode: next });
  }

  function commitWebtoonPadding(next: number) {
    setWebtoonPadding(next);
    saveSetting({ webtoon_padding: next });
  }

  const isPaged = () => readingMode() !== "webtoon";
  const isVertical = () => readingMode() === "paged-vertical";
  const isRtl = () => readingMode() === "paged-rtl";

  return {
    fitMode,
    readingMode,
    webtoonPadding,
    isPaged,
    isVertical,
    isRtl,
    cycleFitMode,
    cycleReadingMode,
    commitWebtoonPadding,
  };
}
