import { createMemo, createSignal } from "solid-js";

import type { Source } from "~/types";

/**
 * Multi-select state for the sources list. `all` resolves the selected entries
 * (so a search-filtered-out selection still counts toward bulk ops); `selectable`
 * is the currently-visible list that select-all / invert / Ctrl+A operate over.
 * `bulkRemoving` is the destructive-confirm flag, cleared whenever selection changes.
 */
export function createSourceSelection(
  all: () => Source[],
  selectable: () => Source[],
) {
  const [active, setActive] = createSignal(false);
  const [ids, setIds] = createSignal<Set<string>>(new Set<string>());
  const [bulkRemoving, setBulkRemoving] = createSignal(false);

  const count = () => ids().size;
  const isSelected = (source: Source) => ids().has(source.id);
  const selectedIds = () => [...ids()];
  const selected = createMemo(() => all().filter((s) => ids().has(s.id)));

  function clear() {
    setIds(new Set<string>());
    setBulkRemoving(false);
  }

  function enter() {
    clear();
    setActive(true);
  }

  function exit() {
    setActive(false);
    clear();
  }

  function toggle(source: Source) {
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(source.id)) next.delete(source.id);
      else next.add(source.id);
      if (next.size === 0) setBulkRemoving(false);
      return next;
    });
  }

  function selectAll() {
    setIds(new Set(selectable().map((s) => s.id)));
    setBulkRemoving(false);
  }

  function selectNone() {
    setIds(new Set<string>());
    setBulkRemoving(false);
  }

  function invert() {
    setIds((prev) => {
      const next = new Set<string>();
      for (const source of selectable()) {
        if (!prev.has(source.id)) next.add(source.id);
      }
      return next;
    });
    setBulkRemoving(false);
  }

  /** Ctrl+A behavior: select all selectable, or clear when all are already selected. */
  function toggleAll() {
    const sel = selectable();
    const allSelected = sel.length > 0 && sel.every((s) => ids().has(s.id));
    setIds(allSelected ? new Set<string>() : new Set(sel.map((s) => s.id)));
    setBulkRemoving(false);
  }

  return {
    active,
    count,
    isSelected,
    selectedIds,
    selected,
    bulkRemoving,
    setBulkRemoving,
    enter,
    exit,
    toggle,
    selectAll,
    selectNone,
    invert,
    toggleAll,
  };
}
