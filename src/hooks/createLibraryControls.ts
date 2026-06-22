import { createSignal, onCleanup, onMount } from "solid-js";

import * as api from "~/api";
import type { LibraryDisplay, ReadingStatus, SortPreference } from "~/types";

import type { FilterState } from "~/components/library/FilterDropdown";

/**
 * Browse-control state for the library grid: filter chips, sort preference, and
 * display options — each paired with a change handler that persists to config.
 * Also owns the Ctrl +/- and Ctrl+Wheel card-resize shortcuts (window
 * listeners mounted/cleaned for the caller's lifetime).
 *
 * `loadPersisted()` hydrates all three from saved config and returns a single
 * promise so the caller can await it alongside its other startup work; each
 * read swallows its own error so a missing key just keeps the default.
 */
export function createLibraryControls() {
  const [filters, setFilters] = createSignal<FilterState>({
    sources: [],
    readingStatus: [],
  });
  const [sortPref, setSortPref] = createSignal<SortPreference>({
    field: "last-read",
    direction: "desc",
  });
  const [displayOpts, setDisplayOpts] = createSignal<LibraryDisplay>({
    display_mode: "comfortable",
    card_size: 8,
    show_unread_badge: false,
    show_continue_button: false,
    show_item_count: true,
  });

  function handleFilterChange(next: FilterState) {
    setFilters(next);
    api.settings
      .setLibraryFilters({
        sources: next.sources,
        reading_status: next.readingStatus,
      })
      .catch(() => {});
  }

  function handleSortChange(next: SortPreference) {
    setSortPref(next);
    api.settings.setLibrarySortPreference(next).catch(() => {});
  }

  function handleDisplayChange(next: LibraryDisplay) {
    setDisplayOpts(next);
    api.settings.setLibraryDisplay(next).catch(() => {});
  }

  function nudgeCardSize(delta: number) {
    const current = displayOpts();
    const next = Math.max(1, Math.min(15, current.card_size + delta));
    if (next === current.card_size) return;
    handleDisplayChange({ ...current, card_size: next });
  }

  // Ctrl + (+/-) to resize cards. Also covers numpad +/- and Ctrl+= (the
  // un-shifted form of Ctrl++ on US layouts).
  function handleResizeKey(e: KeyboardEvent) {
    if (!e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      nudgeCardSize(1);
    } else if (e.key === "-" || e.key === "_") {
      e.preventDefault();
      nudgeCardSize(-1);
    }
  }

  // Ctrl + wheel to resize cards. Listener must be non-passive so we can
  // preventDefault and block the webview's page zoom.
  function handleResizeWheel(e: WheelEvent) {
    if (!e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.deltaY === 0) return;
    e.preventDefault();
    nudgeCardSize(e.deltaY < 0 ? 1 : -1);
  }

  onMount(() => {
    window.addEventListener("keydown", handleResizeKey);
    window.addEventListener("wheel", handleResizeWheel, { passive: false });
    onCleanup(() => {
      window.removeEventListener("keydown", handleResizeKey);
      window.removeEventListener("wheel", handleResizeWheel);
    });
  });

  function loadPersisted(): Promise<unknown> {
    const persistedFilters = api.settings
      .getLibraryFilters()
      .then((saved) =>
        setFilters({
          sources: saved.sources,
          readingStatus: saved.reading_status as ReadingStatus[],
        }),
      )
      .catch(() => {
        /* no saved filters */
      });
    const persistedSort = api.settings
      .getLibrarySortPreference()
      .then((pref) => setSortPref(pref))
      .catch(() => {
        /* no saved sort */
      });
    const persistedDisplay = api.settings
      .getLibraryDisplay()
      .then((disp) => setDisplayOpts(disp))
      .catch(() => {
        /* no saved display */
      });
    return Promise.all([persistedFilters, persistedSort, persistedDisplay]);
  }

  return {
    filters,
    sortPref,
    displayOpts,
    handleFilterChange,
    handleSortChange,
    handleDisplayChange,
    loadPersisted,
  };
}
