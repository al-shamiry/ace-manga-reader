# Ace Manga Reader

A lightweight desktop manga and comic reader built with Tauri v2 and SolidJS.

## Features

- Browse manga libraries organized by source folder
- Supports both folder-based chapters (images in subfolders) and CBZ archives
- Chapter reading with keyboard, tap zone, and button navigation
- Automatic reading progress saved per chapter
- Jump to any page by clicking the page counter
- Auto-advance to next/previous chapter at the end or beginning of a chapter
- Natural sort order (Chapter 2 before Chapter 10)
- Shimmer loading skeletons while scanning

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
| Next page | `→` `↓` |
| Previous page | `←` `↑` |
| Go back | `Backspace` `Escape` |
| Jump to page | Click the page counter |

Left/right tap zones on the page image also work for mouse navigation.

## Tech Stack

| Layer | Choice |
|---|---|
| Shell | Tauri v2 |
| Frontend | SolidJS + TypeScript |
| Styling | Tailwind CSS v4 |
| Build | Vite |
| Archive | `zip` crate (Rust) |

## Roadmap

```
Stage 1 — Library Browser   ██████████  done
Stage 2 — Reader            ██████░░░░  in progress
Stage 3 — Library Mgmt      ░░░░░░░░░░  planned
Stage 4 — Reading Modes     ░░░░░░░░░░  planned
Stage 5 — Advanced          ░░░░░░░░░░  planned
```

<details open>
<summary><b>Stage 1 — Library Browser</b> ✅</summary>

- ✅Project scaffold (Tauri v2 + SolidJS + Tailwind)
- ✅Directory scanner — folder-based and CBZ manga
- ✅Source grid and comic grid with cover images
- ✅CBZ cover extraction and caching
- ✅Shimmer skeletons, empty states, error handling
- ✅Scan cache, alphabetical + natural sort, window title

</details>

<details open>
<summary><b>Stage 2 — Reader</b> 🚧</summary>

- ✅Router with four views: root, source, manga detail, reader
- ✅Chapter list with New / Page N / Done status badges
- ✅Page reader with keyboard, tap zone, and button navigation
- ✅Progress saved per chapter, restored on reopen
- ✅Jump to page by clicking the page counter
- ✅Auto-advance to next/previous chapter at chapter boundaries
- ✅Window title updates on every page turn
- ⬜Fit modes — fit width / fit height / original
- ⬜Reading modes — single page / double page / webtoon scroll
- ⬜Preload adjacent pages, RTL support, fullscreen, progress bar on card

</details>

<details open>
<summary><b>Stage 3 — Library Management</b> 📋</summary>

- ⬜Multiple library folders
- ⬜Favorites and tags
- ⬜Search and filter
- ⬜Sort by name / date added / date modified

</details>

<details open>
<summary><b>Stage 4 — Reading Experience</b> 📋</summary>

- ⬜Continuous webtoon scroll mode
- ⬜Pinch-to-zoom / scroll zoom
- ⬜Bookmarks
- ⬜Reading direction toggle (LTR / RTL)
- ⬜Fullscreen mode

</details>

<details open>
<summary><b>Stage 5 — Advanced</b> 📋</summary>

- ⬜CBR support
- ⬜ComicInfo.xml metadata parsing
- ⬜Settings panel (theme, default reading mode, cache size)
- ⬜Drag-and-drop files onto window
- ⬜Auto-detect new comics in watched directories

</details>

## Screenshots

| | |
|---|---|
| ![Source grid](docs/screenshots/Screenshot%2001.png) | ![Comic grid](docs/screenshots/Screenshot%2002.png) |
| ![Comic grid (CBZ)](docs/screenshots/Screenshot%2003.png) | ![Chapter list](docs/screenshots/Screenshot%2004.png) |

![Reader](docs/screenshots/Screenshot%2005.png)

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
