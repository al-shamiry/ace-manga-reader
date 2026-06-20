import { createMemo, createSignal } from "solid-js";
import type { Manga } from "../types";

/**
 * Multi-select state for a manga grid. `visible` is the accessor for the
 * currently-rendered, filter-aware list — select-all and the all/none toggle
 * operate over exactly what the user can see.
 */
export function createMangaSelection(visible: () => Manga[]) {
  const [active, setActive] = createSignal(false);
  const [ids, setIds] = createSignal<Set<string>>(new Set<string>());

  const count = () => ids().size;
  const isSelected = (manga: Manga) => ids().has(manga.id);
  const selectedIds = () => [...ids()];
  const selected = createMemo(() => visible().filter((m) => ids().has(m.id)));

  function enter() {
    setIds(new Set<string>());
    setActive(true);
  }

  function exit() {
    setActive(false);
    setIds(new Set<string>());
  }

  function toggle(manga: Manga) {
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(manga.id)) next.delete(manga.id);
      else next.add(manga.id);
      return next;
    });
  }

  function selectAll() {
    setIds(new Set(visible().map((m) => m.id)));
  }

  function selectNone() {
    setIds(new Set<string>());
  }

  function invert() {
    setIds((prev) => {
      const next = new Set<string>();
      for (const manga of visible()) {
        if (!prev.has(manga.id)) next.add(manga.id);
      }
      return next;
    });
  }

  /** Ctrl+A behavior: select all visible, or clear when all are already selected. */
  function toggleAll() {
    const vis = visible();
    const allSelected = vis.length > 0 && vis.every((m) => ids().has(m.id));
    setIds(allSelected ? new Set<string>() : new Set(vis.map((m) => m.id)));
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
