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

# Frontend production build
npm run build

# Installer build (Tauri bundle)
npm run tauri build
```

No test infrastructure exists yet (no Vitest, no Rust tests). CI releases run via `.github/workflows/release.yml` on `v*` tag pushes — builds Windows + Linux installers as a **draft** GitHub Release using `tauri-apps/tauri-action`.

## Architecture

**Tauri v2 + SolidJS** desktop manga reader. Rust backend handles file I/O and persistence; frontend is display/navigation with router-state-driven flows.

### Library structure on disk (current model: source-first)
```
Source folder/              ← add directly in Sources view
  Manga title/              ← one Manga entry in the grid
    Chapter 01/             ← chapters can be image folders
      001.jpg
    Chapter 02.cbz          ← or CBZ files (a manga can mix both)
```

`root_directory` in settings is now mostly a compatibility helper. On startup, if a root is set and no sources exist yet, immediate root subfolders are imported as sources.

### Data flow

1. Sources load from manga DB via `list_sources`
2. Opening a source calls `scan_source(path, force_refresh?)` → `Manga[]` and updates cache/metadata
3. Opening a manga detail calls `list_chapters(manga_path)` → `Chapter[]` + saved progress
4. Opening a chapter calls `open_chapter(chapter_path, file_type)`; frontend renders via `convertFileSrc`
5. Reader updates progress via `set_chapter_progress` and history via `record_history`

### Backend architecture (layered)
Strict layers with downward-only dependencies (`commands → services → store → models`; `infra` is a leaf). Registered commands live in `src-tauri/src/lib.rs` — check `generate_handler!` for the canonical list.

- `commands/` — thin Tauri IPC handlers; validate input and delegate. Modules: `sources`, `reader`, `library` (categories + library membership), `settings`, `history`.
- `services/` — domain logic, no `#[tauri::command]`: `scan` (disk scan + source reconciliation), `relocate` (relocation transaction), `chapters` (discovery, page loading, read-state), `cache` (cover/page cleanup). Services never call sibling services — cross-feature flows are orchestrated in the command (e.g. `relocate_source` → `services::relocate` → `store::history::rekey` → `services::cache`).
- `store/` — persistence; owns all file I/O and the DB cache: `db` (`MangaDbCache` in managed state + `lock`/`mutate`/`get_manga`/`save_db` and the `app.db()` accessor), `config` (`config.json` + per-manga reader settings), `history` (`history.json` + `prune_mangas`/`rekey_mangas`).
- `models/` — pure serde types: `manga`, `source`, `chapter`, `category`, `history`, `db` (`MangaDb`), `settings` (`Config`, `ReaderSettings`, sort/display/filter types). DTO (sent to frontend) vs `*Record` (persisted) split.
- `infra/` — dependency-free primitives: `paths`, `image` (fs discovery), `archive` (CBZ extract/count), `naming` (`path_id`, `normalize`, `title_from_path`, `natural_cmp`, `now_epoch`), `atomic` (`write_atomic_json`).
- `app.rs` — Tauri `setup` (data-dir + cache state init); `lib.rs` holds the builder chain + handler list.

### DB access pattern
Use the `app.db()` extension trait (`store::db::DbExt`) instead of `app.state::<Mutex<MangaDbCache>>()`, then go through `store::db::{lock, mutate, get_manga, save_db}` — never read/write `manga_db.json` directly.

### Frontend contexts (`src/context/`)
- `SourcesContext` — source list, CRUD, scan status, `initialLoad`, mutation counter
- `LibraryContext` — categories/library-entry signals, refresh helpers, `initialLoad`
- `ViewLoadingContext` — sequence-token busy/ready API used by `LoadingOverlay`

Router state is the primary cross-view payload mechanism (no global "current chapter" store). Routes in `src/index.tsx`. `ReaderView` receives `{ chapter, manga, prevChapter?, nextChapter?, initialPage? }`; `MangaDetailView` receives `Manga`.

### Asset protocol
Pages/covers served via Tauri asset protocol. Use `convertFileSrc(path)` from `@tauri-apps/api/core` (resolves to `http://asset.localhost/...` — note `http://` not `https://`).

### Title normalisation (`infra::naming::title_from_path`)
- Strips trailing `_HEXSTRING` suffixes (4–16 hex chars) — download-tool dedup hashes
- Replaces `_ ` with `: ` — Windows-safe filename restoration

### Persistent storage (`app_data_dir`, typically `%APPDATA%\ace-manga-reader\` on Windows)
| Path | Contents |
|---|---|
| `config.json` | Global config: root directory, reading defaults, filters, sort/display prefs, categories, active category |
| `manga_db.json` | Central DB: sources + manga state (progress, categories per manga, metadata) |
| `history.json` | Recently-read entries (1000 cap, deduped by manga) |
| `cache/covers/` | Extracted CBZ cover cache |
| `cache/pages/{chapter_id}/` | Extracted CBZ page cache |
| `settings/{manga_id}.json` | Per-manga reader overrides (`fit_mode`, `reading_mode`, `webtoon_padding`) |

Legacy files (`library.json`, `progress.json`) may exist on older installs but are not part of the active persistence model.

### ReaderView — architectural hotspot
`src/views/ReaderView.tsx`:
- **4 reading modes**: `paged-ltr`, `paged-rtl`, `paged-vertical`, `webtoon` (cycle: `m`)
- **5 fit modes** (paged only): `fit-screen`, `fit-width`, `fit-height`, `original`, `stretch` (cycle: `f`)
- **Webtoon side padding**: 0–25%, persisted in settings; adjustable via UI slider and `Ctrl+Wheel`
- **Tap zones**: thirds (paged: left/center/right or top/center/bottom in vertical; webtoon: sticky top/center/bottom)
- **Keyboard**: arrows navigate/scroll; webtoon uses rAF continuous scrolling with >2s speed boost; `Backspace`/`Escape` back; `F11` fullscreen
- **Page flip animations**: direction-aware `slide-in-*` / `slide-out-*` classes (~200ms)
- **Chapter edge behavior**: extra input at boundary advances to prev/next chapter
- **Settings**: `get_manga_reader_settings` merges per-manga values with global defaults (`get_default_reader_settings`)
- **Progress/history**: progress saved on page turns, history recorded on chapter open
- **Code pattern**: handlers/helpers above JSX; keep template declarative

### Conventions
- Conventional Commits (`feat`, `fix`, `refactor`, `perf`, `docs`, `chore`)
- IDs = first 8 bytes of SHA-256(path), hex-encoded (`path_id`)
- Rust normalizes paths to forward slashes before sending to frontend
- Tailwind v4 CSS-first (`@import "tailwindcss"` in `global.css`; no `tailwind.config.js`)
- `src/types.ts` must stay aligned with Rust command payloads

### Cross-agent guardrails
- Keep frontend/backend contracts in sync: if a Rust command payload changes, update `src/types.ts` and all frontend consumers
- Preserve config compatibility: prefer additive changes to persisted keys (`config.json`, per-manga settings) and avoid breaking existing installs
- Keep TypeScript strictness intact; avoid `any` unless unavoidable
- Do not introduce unnecessary dependencies when existing stack/utilities can solve the problem
- Register all new commands in `tauri::generate_handler!` (`src-tauri/src/lib.rs`)

### UI/UX constraints
- Dark-first aesthetic using `ink-*` + `jade-*` tokens from `global.css` (avoid stock Tailwind palette)
- Motion purposeful/short (generally <=200ms)
- Keyboard-first workflows for core actions
- Reader experience is sacred: low noise, content-first
- Typography: Newsreader (`font-display`) for hero titles, Hanken Grotesk (`font-sans`) for UI
