import { createSignal, onCleanup, onMount } from "solid-js";

import * as api from "~/api";
import type {
  DisplayOverride,
  DisplayScope,
  LibraryDisplay,
  LibraryFilters,
  ReadingStatus,
  SortPreference,
  SourceFilters,
} from "~/types";

import { DEFAULT_DISPLAY } from "~/lib/display-defaults";

import type { FilterState } from "~/components/library/FilterDropdown";

/**
 * Which persisted browse-prefs the controls read/write. The library and source
 * grids share the same UI + resize behaviour but store their prefs under
 * separate config keys (source has no per-source filter chips and defaults to
 * alphabetical A→Z). Display resolves from the global default plus a per-view
 * override.
 */
export type BrowseScope = DisplayScope;

const DEFAULT_SORT: Record<BrowseScope, SortPreference> = {
  library: { field: "last-read", direction: "desc" },
  source: { field: "alphabetical", direction: "asc" },
};

function diffDisplay(
  prev: LibraryDisplay,
  next: LibraryDisplay,
): DisplayOverride {
  const patch: Record<string, unknown> = {};
  for (const key of Object.keys(next) as (keyof LibraryDisplay)[]) {
    if (next[key] !== prev[key]) patch[key] = next[key];
  }
  return patch as DisplayOverride;
}

/**
 * Browse-control state for a manga grid: filter chips, sort preference, and
 * display options — each paired with a change handler that persists to config.
 * Also owns the Ctrl +/- and Ctrl+Wheel card-resize shortcuts (window
 * listeners mounted/cleaned for the caller's lifetime).
 *
 * `scope` selects which config keys back the controls ("library" by default,
 * "source" for the per-source grid), including which display override is
 * written.
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
    DEFAULT_SORT[scope],
  );
  const [displayOpts, setDisplayOpts] =
    createSignal<LibraryDisplay>(DEFAULT_DISPLAY);
  const [displayOverridden, setDisplayOverridden] = createSignal(false);

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

  // Optimistic: apply locally, then persist only the changed fields as this
  // view's override. Only `overridden` is read back from the response so a
  // burst of Ctrl+wheel resizes can't be clobbered by a stale reply.
  function handleDisplayChange(next: LibraryDisplay) {
    const patch = diffDisplay(displayOpts(), next);
    if (Object.keys(patch).length === 0) return;
    setDisplayOpts(next);
    setDisplayOverridden(true);
    api.settings
      .patchViewDisplay(scope, patch)
      .then((res) => setDisplayOverridden(res.overridden))
      .catch(() => {});
  }

  function handleDisplayReset() {
    api.settings
      .resetViewDisplay(scope)
      .then((res) => {
        setDisplayOpts(res.display);
        setDisplayOverridden(res.overridden);
      })
      .catch(() => {});
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

    const persistedDisplay = api.settings
      .getViewDisplay(scope)
      .then((res) => {
        setDisplayOpts(res.display);
        setDisplayOverridden(res.overridden);
      })
      .catch(() => {
        /* keep placeholder display */
      });

    return Promise.all([persistedFilters, persistedSort, persistedDisplay]);
  }

  return {
    filters,
    sortPref,
    displayOpts,
    displayOverridden,
    handleFilterChange,
    handleSortChange,
    handleDisplayChange,
    handleDisplayReset,
    loadPersisted,
  };
}
