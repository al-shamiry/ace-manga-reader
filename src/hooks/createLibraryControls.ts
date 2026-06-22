import { createSignal, onCleanup, onMount } from "solid-js";

import * as api from "~/api";
import type {
  LibraryDisplay,
  LibraryFilters,
  ReadingStatus,
  SortPreference,
  SourceDisplay,
  SourceFilters,
} from "~/types";

import type { FilterState } from "~/components/library/FilterDropdown";

/**
 * Which persisted browse-prefs the controls read/write. The library and source
 * grids share the same UI + resize behaviour but store their prefs under
 * separate config keys with different defaults (source has no item-count or
 * per-source filter chips, and defaults to alphabetical A→Z).
 */
export type BrowseScope = "library" | "source";

const DEFAULTS: Record<
  BrowseScope,
  { sort: SortPreference; display: LibraryDisplay }
> = {
  library: {
    sort: { field: "last-read", direction: "desc" },
    display: {
      display_mode: "comfortable",
      card_size: 8,
      show_unread_badge: false,
      show_continue_button: false,
      show_item_count: true,
    },
  },
  source: {
    sort: { field: "alphabetical", direction: "asc" },
    display: {
      display_mode: "comfortable",
      card_size: 8,
      show_unread_badge: false,
      show_continue_button: false,
      show_item_count: false,
    },
  },
};

/**
 * Browse-control state for a manga grid: filter chips, sort preference, and
 * display options — each paired with a change handler that persists to config.
 * Also owns the Ctrl +/- and Ctrl+Wheel card-resize shortcuts (window
 * listeners mounted/cleaned for the caller's lifetime).
 *
 * `scope` selects which config keys back the controls ("library" by default,
 * "source" for the per-source grid) and their defaults.
 *
 * `loadPersisted()` hydrates all three from saved config and returns a single
 * promise so the caller can await it alongside its other startup work; each
 * read swallows its own error so a missing key just keeps the default.
 */
export function createLibraryControls(scope: BrowseScope = "library") {
  const [filters, setFilters] = createSignal<FilterState>({
    sources: [],
    readingStatus: [],
  });
  const [sortPref, setSortPref] = createSignal<SortPreference>(
    DEFAULTS[scope].sort,
  );
  const [displayOpts, setDisplayOpts] = createSignal<LibraryDisplay>(
    DEFAULTS[scope].display,
  );

  function handleFilterChange(next: FilterState) {
    setFilters(next);
    if (scope === "source") {
      api.settings
        .setSourceFilters({ reading_status: next.readingStatus })
        .catch(() => {});
    } else {
      api.settings
        .setLibraryFilters({
          sources: next.sources,
          reading_status: next.readingStatus,
        })
        .catch(() => {});
    }
  }

  function handleSortChange(next: SortPreference) {
    setSortPref(next);
    const persist =
      scope === "source"
        ? api.settings.setSourceSortPreference(next)
        : api.settings.setLibrarySortPreference(next);
    persist.catch(() => {});
  }

  function handleDisplayChange(next: LibraryDisplay) {
    setDisplayOpts(next);
    if (scope === "source") {
      api.settings
        .setSourceDisplay({
          display_mode: next.display_mode,
          card_size: next.card_size,
          show_unread_badge: next.show_unread_badge,
          show_continue_button: next.show_continue_button,
        })
        .catch(() => {});
    } else {
      api.settings.setLibraryDisplay(next).catch(() => {});
    }
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
    const savedFilters: Promise<LibraryFilters | SourceFilters> =
      scope === "source"
        ? api.settings.getSourceFilters()
        : api.settings.getLibraryFilters();
    const persistedFilters = savedFilters
      .then((saved) =>
        setFilters({
          sources: "sources" in saved ? saved.sources : [],
          readingStatus: saved.reading_status as ReadingStatus[],
        }),
      )
      .catch(() => {
        /* no saved filters */
      });

    const savedSort: Promise<SortPreference> =
      scope === "source"
        ? api.settings.getSourceSortPreference()
        : api.settings.getLibrarySortPreference();
    const persistedSort = savedSort
      .then((pref) => setSortPref(pref))
      .catch(() => {
        /* no saved sort */
      });

    const savedDisplay: Promise<LibraryDisplay | SourceDisplay> =
      scope === "source"
        ? api.settings.getSourceDisplay()
        : api.settings.getLibraryDisplay();
    const persistedDisplay = savedDisplay
      .then((disp) => setDisplayOpts((prev) => ({ ...prev, ...disp })))
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
