# Ace Manga Reader

A lightweight desktop manga reader built with Tauri v2 and SolidJS.

## Features

### Library
- Browse manga libraries organized by source folder
- Supports both folder-based chapters (images in subfolders) and CBZ archives
- **Categories** with tab bar — manga can live in multiple categories, right-click to rename/delete
- **Add to Library** with category picker; reflected as a bookmark overlay on manga cards
- **Search** by title (instant, client-side)
- **Filter** by source folder and reading status (Unread / Started / Completed)
- **Sort** alphabetically, by total chapters, last read, or date added — with direction toggle
- **Display modes**: Compact / Comfortable / Cover-only grids and List view, with adjustable card size
- **Card overlays**: unread chapter badge and continue-reading button (toggle in Display Options)
- **History** view — recently read manga grouped by day, click to resume from your last page
- **Settings** view — root directory, default fit mode, default reading mode, library display defaults

### Reader
- **4 reading modes**: Paged LTR, Paged RTL, Paged Vertical, Webtoon (continuous scroll)
- **5 fit modes**: Fit Screen, Fit Width, Fit Height, Original, Stretch
- Reading mode and fit mode persisted **per-manga** with global defaults
- Chapter reading with keyboard, tap zone, and button navigation
- Continuous keyboard scrolling in webtoon mode with speed boost on long hold
- Automatic reading progress saved per chapter
- Jump to any page by clicking the page counter
- Auto-advance to next/previous chapter at chapter boundaries
- Page flip animations (direction-aware for each reading mode)
- Fullscreen mode (F11 or toolbar button)

### Polish
- Side navigation rail (Library / History / Sources / Settings)
- Natural sort order (Chapter 2 before Chapter 10)
- Smart title cleanup — strips download-tool hash suffixes and restores `:` characters mangled by Windows filename rules
- Shimmer loading skeletons while scanning
- Editorial empty states with no centered modals

## Library Structure

The app expects your manga organized like this:

```
Root folder/
  Source folder/              ← shows up as a source in the app
    Manga Title/
      Chapter 01/             ← folder-based: subfolders of images
        001.jpg
        002.jpg
      Chapter 02/
        ...
    Another Manga/
      issue001.cbz            ← CBZ-based: CBZ files inside the manga folder
      issue002.cbz
```

Set your root folder in the app and it will scan one level deep for manga.

## Navigation

| Action | Keys |
|---|---|
| Next page / Scroll down | `→` `↓` |
| Previous page / Scroll up | `←` `↑` |
| Cycle fit mode | `F` |
| Cycle reading mode | `M` |
| Fullscreen | `F11` |
| Go back | `Backspace` `Escape` |
| Jump to page | Click the page counter |

Tap zones on the page image also work for mouse navigation — direction adapts to reading mode.

## Tech Stack

| Layer | Choice |
|---|---|
| Shell | Tauri v2 |
| Frontend | SolidJS + TypeScript |
| Styling | Tailwind CSS v4 |
| Build | Vite |
| Archive | `zip` crate (Rust) |

## Download

Pre-built installers for Windows and Linux are available on the [Releases page](https://github.com/al-shamiry/ace-manga-reader/releases).

> Windows builds are not yet code-signed, so SmartScreen will show a warning on first run. Click **More info → Run anyway** to install.

## Roadmap

```
Stage 1 — Library Browser     ██████████  done
Stage 2 — Manga Reader        ██████████  done
Stage 3 — Library Management  ██████████  done
Stage 4 — Sources Management  ░░░░░░░░░░  planned
Stage 5 — Advanced            ░░░░░░░░░░  planned
```

<details open>
<summary><b>Stage 1 — Library Browser</b> ✅</summary>

- ✅Project scaffold (Tauri v2 + SolidJS + Tailwind)
- ✅Directory scanner — folder-based and CBZ manga
- ✅Source grid and manga grid with cover images
- ✅CBZ cover extraction and caching
- ✅Shimmer skeletons, empty states, error handling
- ✅Scan cache, alphabetical + natural sort, window title

</details>

<details open>
<summary><b>Stage 2 — Manga Reader</b> ✅</summary>

- ✅Router with four views: root, source, manga detail, reader
- ✅Chapter list with New / Page N / Done status badges
- ✅Page reader with keyboard, tap zone, and button navigation
- ✅Progress saved per chapter, restored on reopen
- ✅Jump to page by clicking the page counter
- ✅Auto-advance to next/previous chapter at chapter boundaries
- ✅Window title updates on every page turn
- ✅5 fit modes (Fit Screen, Fit Width, Fit Height, Original, Stretch) — persisted per-manga
- ✅4 reading modes (Paged LTR, Paged RTL, Paged Vertical, Webtoon Scroll) — persisted per-manga
- ✅RTL support (reversed tap zones, arrow keys, and chapter navigation)
- ✅Page flip animations (direction-aware)
- ✅Continuous keyboard scrolling in webtoon mode with speed boost
- ✅Fullscreen toggle (F11 / toolbar)

</details>

<details open>
<summary><b>Stage 3 — Library Management</b> ✅</summary>

- ✅Collapsible side navigation (Library / History / Sources / Settings)
- ✅Categories with tab bar — manga can belong to multiple categories
- ✅Add to Library with category picker, bookmark overlay on cards
- ✅Search by title (instant, client-side)
- ✅Filter by source folder and reading status (Unread / Started / Completed)
- ✅Sort alphabetically, total chapters, last read, date added — with direction toggle
- ✅Display options popover: grid styles (Compact / Comfortable / Cover-only / List), card size, unread badges, continue-reading button
- ✅History view — recently read manga grouped by day, click to resume
- ✅Settings view — root directory, default fit mode, default reading mode, library display defaults
- ✅Persistent state across restarts (filters, sort, active category, display options)

</details>

<details open>
<summary><b>Stage 4 — Sources Management</b> 📋</summary>

- ⬜Sources view listing all source folders with manga counts and last-scanned dates
- ⬜Add/remove source folders directly from the app
- ⬜Per-source and bulk re-scan
- ⬜Source ordering and visibility toggle

</details>

<details open>
<summary><b>Stage 5 — Advanced</b> 📋</summary>

- ⬜CBR (RAR) archive support
- ⬜Pinch-to-zoom / scroll zoom
- ⬜Bookmarks within a manga
- ⬜ComicInfo.xml metadata parsing
- ⬜Theme customization
- ⬜Drag-and-drop files onto window
- ⬜Auto-detect new manga in watched directories

</details>

## Screenshots


| | |
|---|---|
| ![Loading Screen](docs/screenshots/Screenshot%2001.png) | ![First-run welcome](docs/screenshots/Screenshot%2002.png) |
| ![Library with display options popover](docs/screenshots/Screenshot%2003.png) | ![Reader view](docs/screenshots/Screenshot%2004.png) |
| ![History view](docs/screenshots/Screenshot%2005.png) | ![Sources picker](docs/screenshots/Screenshot%2006.png) |
| ![Source manga grid](docs/screenshots/Screenshot%2007.png) | ![Settings view](docs/screenshots/Screenshot%2008.png) |


## Development

```bash
# Run in dev mode (Tauri window + Vite HMR)
npm run tauri dev

# Type-check frontend
npx tsc --noEmit

# Check Rust
cd src-tauri && cargo check

# Production build
npm run tauri build
```

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/)
- Tauri v2 prerequisites — see [Tauri docs](https://tauri.app/start/prerequisites/)
