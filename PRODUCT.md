# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

(Tauri v2 desktop app rendering a SolidJS frontend in the system webview. Ships as Windows and Linux installers. Desktop-native conventions apply, not mobile or browser-site conventions.)

## Users

Desktop manga readers with their own local collections of manga stored as image folders or CBZ archives. The audience is public: people who download the installer from GitHub Releases and have never seen the app before, alongside long-time power users who know every shortcut.

The usual situation is leisure reading at a desktop or laptop, often in a dark room, often in long uninterrupted sessions. The job: open the app, find where they left off, and disappear into the page. Keyboard and mouse are both first-class inputs.

## Product Purpose

A lightweight, fast reader for manga the user already owns on disk. It turns a folder tree of sources, titles and chapters into a browsable library and gets out of the way while reading. Success means the reader is immersive and never blocks, progress is never lost, and a new user can point the app at their folders and be reading within a minute.

## Positioning

Local-only by design. The app reads the user's own folders and CBZ files and nothing else: no accounts, no online sources, no scraping, no sync, and nothing leaves the machine. This is a durable principle, not a temporary gap.

## Operating Context

- Library model is source-first: a source folder contains manga folders, which contain chapters as image subfolders or `.cbz` files (mixed within one manga is fine).
- Core flow: Sources → manga grid → manga detail (chapter list + progress) → reader → History to resume.
- Reader supports four reading modes (paged LTR, paged RTL, paged vertical, webtoon) and five fit modes, persisted per manga with global defaults.
- Keyboard shortcuts drive the reader (`m` reading mode, `f` fit mode, arrows, `Esc`/`Backspace` back, `F11` fullscreen).
- Persistent state lives in the OS app-data directory (`config.json`, `manga_db.json`, `history.json`, per-manga settings, cover/page cache).

## Capabilities and Constraints

- Library: categories (many-to-many), add-to-library, instant title search, filter by source and reading status, multiple sort keys, display modes (compact, comfortable, cover-only, list) with adjustable card size, unread and continue-reading overlays.
- History grouped by day with resume-at-page.
- Title cleanup strips download-tool hash suffixes and restores `:` mangled by Windows filename rules.
- Performance is a product requirement: scans are cached, CBZ pages and covers are extracted to cache, and the reader must never block on I/O.
- Persisted config must stay backward compatible across releases (additive changes only).
- Distribution: GitHub Releases (draft), Windows + Linux.

## Brand Commitments

- Name: Ace Manga Reader.
- Personality: quiet, focused, immersive. The aspiration is a Kindle or Apple Books for manga: calm and confident, so unobtrusive the chrome is forgotten within a minute of reading.
- Voice: terse and functional. Labels, not slogans; status, not celebration. No exclamation marks, no marketing copy, no mascots.
- Emotional goals: calm (never busy or anxious), trust (progress is never lost, state is always clear), focus (one thing at a time, no nagging).
- Must feel like a native desktop app, never a website in a window.
- Explicit anti-references: generic Material/Bootstrap admin dashboards, cluttered legacy desktop apps such as Calibre, and childish/kawaii anime aesthetics.

## Evidence on Hand

- README feature list and CLAUDE.md architecture notes describe shipped functionality.
- No testimonials, user counts, download figures, reviews, or press exist. Do not fabricate any.

## Product Principles

1. **The page is the product.** Every element is judged by whether it helps the user read or gets in the way. When in doubt, hide it, dim it, or move it behind a keystroke. The reader view is sacred.
2. **Calm over clever.** Restraint is the default; if a screen feels designed, it is probably overdesigned.
3. **Keyboard first, discoverable second.** Every feature asks "what's the keystroke?" first, but now that the app is public, visible affordances must let a newcomer find each feature without documentation.
4. **Native, not web.** Desktop conventions (context menus, hover states, real cursors, system-feeling spacing) over web idioms (hero sections, CTA buttons, link underlines).
5. **Performance is a design value.** A slow interaction is a design bug. Trade flourish for responsiveness every time.
6. **Your files, your machine.** Local-only, offline, no accounts; features that would require the network are out of scope.
