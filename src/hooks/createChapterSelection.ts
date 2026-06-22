import { createMemo, createSignal } from "solid-js";

import type { Chapter } from "~/types";

/**
 * Multi-select state for the chapter list. `visible` is the accessor for the
 * currently-rendered, filter-aware list — select-all and the all/none toggle
 * operate over exactly what the user can see. Mirrors createMangaSelection.
 */
export function createChapterSelection(visible: () => Chapter[]) {
  const [active, setActive] = createSignal(false);
  const [ids, setIds] = createSignal<Set<string>>(new Set<string>());

  const count = () => ids().size;
  const isSelected = (chapter: Chapter) => ids().has(chapter.id);
  const selectedIds = () => [...ids()];
  const selected = createMemo(() => visible().filter((c) => ids().has(c.id)));

  function enter() {
    setIds(new Set<string>());
    setActive(true);
  }

  function exit() {
    setActive(false);
    setIds(new Set<string>());
  }

  function toggle(chapter: Chapter) {
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(chapter.id)) next.delete(chapter.id);
      else next.add(chapter.id);
      return next;
    });
  }

  function selectAll() {
    setIds(new Set(visible().map((c) => c.id)));
  }

  function selectNone() {
    setIds(new Set<string>());
  }

  function invert() {
    setIds((prev) => {
      const next = new Set<string>();
      for (const chapter of visible()) {
        if (!prev.has(chapter.id)) next.add(chapter.id);
      }
      return next;
    });
  }

  /** Ctrl+A behavior: select all visible, or clear when all are already selected. */
  function toggleAll() {
    const vis = visible();
    const allSelected = vis.length > 0 && vis.every((c) => ids().has(c.id));
    setIds(allSelected ? new Set<string>() : new Set(vis.map((c) => c.id)));
  }

  return {
    active,
    count,
    isSelected,
    selectedIds,
    selected,
    enter,
    exit,
    toggle,
    selectAll,
    selectNone,
    invert,
    toggleAll,
  };
}
