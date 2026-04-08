# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Dev (Tauri window + Vite HMR, frontend on port 1420)
npm run tauri dev

# Type-check frontend only
npx tsc --noEmit

# Check Rust only
cd src-tauri && cargo check

# Production build
npm run tauri build
```

No test infrastructure exists yet (no Vitest, no Rust tests). CI builds run via [.github/workflows/release.yml](.github/workflows/release.yml) on `v*` tag pushes — produces Windows + Linux installers as a draft GitHub Release using `tauri-apps/tauri-action`.

## Architecture

This is a **Tauri v2 + SolidJS** desktop manga reader. The Rust backend handles all file I/O; the frontend is purely display and navigation.

### Library structure the app expects on disk
```
Root folder/            ← user-selected root
  Source folder/        ← shows as a source card on the home screen
    Manga title/        ← one Manga entry in the grid
      Chapter 01/       ← chapters can be subfolders containing images
        001.jpg
      Chapter 02/
        ...
      bonus.cbz         ← …or CBZ files (a manga can mix both)
    Another Manga/
      issue001.cbz
      issue002.cbz
```

### Data flow

1. User sets a root directory → `list_sources` returns immediate subdirs as `Source[]`
2. Clicking a source → `scan_directory` scans one level deep, returns `Manga[]` (cached in `app_data_dir/scan_cache/`)
3. Clicking a manga → navigates to `/manga/:id` with the `Manga` as router state → `get_chapters(manga_path)` returns `Chapter[]` (both dir and CBZ chapters) with progress
4. Clicking a chapter → navigates to `/reader/:id` with `{ chapter, manga, prevChapter?, nextChapter?, initialPage? }` as router state → `open_chapter` extracts/returns page paths → frontend loads via `convertFileSrc`

### Tauri commands (registered in `lib.rs`)
| Module | Commands |
|---|---|
| `commands::library` | `scan_directory`, `list_sources` |
| `commands::reader` | `get_chapters`, `open_chapter`, `set_chapter_progress`, `mark_chapter_read` |
| `commands::settings` | `get_settings`, `set_settings`, `get_root_directory`, `set_root_directory`, `get_library_filters`, `set_library_filters`, `get_active_category`, `set_active_category` |
| `commands::categories` | `get_categories`, `create_category`, `rename_category`, `delete_category`, `reorder_categories`, `get_library`, `add_to_library`, `remove_from_library`, `is_in_library` |
| `commands::history` | `get_history`, `record_history`, `delete_history_entry`, `clear_history` |

### Key Rust files
- `utils.rs` — shared utilities: `is_image`, `path_id`, `normalize`, `title_from_path`, `natural_cmp`, `subdirs`, `images_in`, `cbz_files_in`
- `commands/library.rs` — directory scanning, source listing, scan cache
- `commands/reader.rs` — `get_chapters`, `open_chapter`, `set_chapter_progress`, `mark_chapter_read`
- `commands/settings.rs` — unified config persistence (`config.json`), per-manga settings, root directory, filters, active category
- `commands/categories.rs` — category CRUD, library entry management (add/remove manga, per-manga `read_chapters` cache)
- `commands/history.rs` — recently-read tracking (1000-entry cap, dedupe by `manga_id`)
- `models/manga.rs` — `Manga` struct (id, title, path, cover_path, chapter_count)
- `models/chapter.rs` — `Chapter` struct + `ChapterStatus` enum (`Unread` / `Ongoing { page }` / `Read`)
- `models/category.rs` — `Category`, `LibraryEntry`, `LibraryData` structs
- `models/history.rs` — `HistoryEntry`, `HistoryData` structs

### Key frontend files
- `src/types.ts` — `Manga`, `Chapter`, `ChapterStatus`, `Category`, `LibraryEntry`, `LibraryFilters`, etc. (must stay in sync with Rust structs)
- `src/index.tsx` — route definitions (Router + Route setup)
- `src/App.tsx` — root layout, wraps routes with `LibraryProvider`, conditionally shows `SideNav` (hidden in reader)
- `src/context/LibraryContext.tsx` — holds `sources`, `categories`, `libraryEntries` signals + `loadRoot`, `getSource(id)`, `isInLibrary(id)`, `refreshCategories`, `refreshLibrary`
- `src/styles/global.css` — Tailwind v4 import + `.manga-grid` / `.source-grid` CSS grid definitions
- Icons come from `lucide-solid`

### Routing
| Path | View | State passed |
|---|---|---|
| `/` | LibraryView | — (library with category tabs, search, filters) |
| `/source/:id` | SourceView | — (source looked up via context) |
| `/manga/:id` | MangaDetailView | `Manga` object |
| `/reader/:id` | ReaderView | `{ chapter, manga, prevChapter?, nextChapter?, initialPage? }` |
| `/history` | HistoryView | — (recently read, day-grouped) |
| `/sources` | SourcesView | — (directory picker + source grid) |
| `/settings` | SettingsView | — (general / reading / display sections) |

Router state is the mechanism for passing data between views — no global store for current manga/chapter. Routes defined in `src/index.tsx`.

### Asset protocol
Pages and covers are served via Tauri's asset protocol: `http://asset.localhost/` + `encodeURIComponent(absolutePath)`. Use `convertFileSrc(path)` from `@tauri-apps/api/core` which does this automatically. Note: protocol is `http://` not `https://`.

### Title normalisation (in `utils::title_from_path`)
- Trailing `_HEXSTRING` suffixes (4–16 hex chars) are stripped — download tools append these for deduplication
- `_ ` is replaced with `: ` — Windows forbids `:` in filenames so download tools substitute `_`

### Persistent storage (all in `app_data_dir` = `%APPDATA%\Roaming\ace-manga-reader\`)
| Path | Contents |
|---|---|
| `config.json` | Unified config: root_directory, fit_mode, reading_mode, library_filters, library_display, library_sort, active_category |
| `library.json` | Categories + library entries (manga added to library with `read_chapters` cache, `last_read_at`, `added_at`) |
| `history.json` | Recently read entries (capped at 1000, deduped by `manga_id`) |
| `covers/` | Extracted cover images (CBZ covers cached here) |
| `pages/{chapter_id}/` | Extracted CBZ pages (cached after first `open_chapter` call) |
| `scan_cache/{source_id}.json` | Cached `Manga[]` scan results per source |
| `progress.json` | Single JSON map of `chapter_id → ChapterStatus` |
| `settings/{manga_id}.json` | Per-manga setting overrides (fit mode, reading mode) |

Note: `lib.rs` has migration logic that converts old separate files (`settings.json`, `root_directory.txt`, `library_filters.json`, `categories.json`) into the unified `config.json` and `library.json` on startup.

### ReaderView — the complex component
`src/views/ReaderView.tsx` is the architectural centerpiece. Key patterns:
- **4 reading modes**: `paged-ltr`, `paged-rtl`, `paged-vertical`, `webtoon` (continuous scroll) — cycled with `m`
- **5 fit modes**: `fit-screen`, `fit-width`, `fit-height`, `original`, `stretch` — cycled with `f` (paged only)
- **Tap zones**: paged modes use left/center/right thirds; webtoon uses top/center/bottom thirds. Webtoon tap zones are sticky inside the scroll container to respect scrollbars
- **Keyboard**: arrow keys navigate pages (paged) or continuously scroll via `requestAnimationFrame` loop (webtoon). Holding >2s boosts scroll speed. Backspace/Escape goes back
- **Page flip animations**: direction-aware CSS animations (`slide-in-{dir}` / `slide-out-{dir}`, 200ms) defined in `global.css`
- **Chapter auto-advance**: reaching scroll edge (webtoon) or last/first page (paged) + one more input navigates to next/prev chapter
- **Settings per-manga**: `get_settings(mangaId)` loads manga-specific overrides with global fallback; saved on every mode change
- **Progress**: saved on every page turn via `set_chapter_progress`; window title updates to show current page
- **Pattern**: all event handlers are extracted as named functions above the JSX return — keep the template minimal

### Frontend patterns
- SolidJS reactivity: `createSignal`, `createEffect`, `createMemo`, `Show`/`Index` for conditional/list rendering
- Navigation uses router state to pass data between views (no global store)
- Icons from `lucide-solid`
- Shared components: `Button` (variant: primary/ghost, iconOnly), `Checkbox`, `Skeleton` (shimmer loading), `MangaCard`, `MangaGrid`, `SourceCard`, `SourceGrid`, `SideNav` (collapsible, 52px→180px), `TabBar` (animated underline, context menu rename), `FilterDropdown`, `SortDropdown`, `SearchToggle`, `DirectoryPicker`, `DisplayOptionsPopover`, `EmptyState` (unified empty/first-run state), `LoadingOverlay`, `TitleBar`
- Custom CSS classes in `global.css`: `.manga-grid`/`.source-grid` (CSS Grid), `.cursor-{left|right|up|down}` (SVG data URI cursors), `.skeleton` (shimmer animation)

### Conventions
- Commit messages follow **Conventional Commits** (`feat`, `fix`, `refactor`, `perf`, `docs`, `chore`)
- IDs are the first 8 bytes of SHA-256 of the absolute path, hex-encoded
- All paths are normalised to forward slashes in Rust via `normalize()` before being sent to the frontend
- Tailwind v4 is used CSS-first (`@import "tailwindcss"` in global.css) — no `tailwind.config.js`
- `Manga.chapter_count` not `page_count` — page counting was removed for scan performance
