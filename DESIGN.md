---
name: Ace Manga Reader
description: A quiet, dark-first desktop reader where the page is the only thing lit.
colors:
  ink-50: "oklch(97% 0.006 215)"
  ink-100: "oklch(93% 0.008 215)"
  ink-200: "oklch(85% 0.01 215)"
  ink-300: "oklch(76% 0.011 215)"
  ink-400: "oklch(65% 0.012 215)"
  ink-500: "oklch(53% 0.013 215)"
  ink-600: "oklch(40% 0.014 215)"
  ink-700: "oklch(29% 0.015 215)"
  ink-800: "oklch(21% 0.014 215)"
  ink-900: "oklch(16% 0.013 215)"
  ink-950: "oklch(12% 0.012 215)"
  jade-300: "oklch(82% 0.11 175)"
  jade-400: "oklch(74% 0.13 175)"
  jade-500: "oklch(66% 0.14 175)"
  jade-600: "oklch(58% 0.13 175)"
  jade-700: "oklch(48% 0.11 175)"
  jade-900: "oklch(28% 0.06 175)"
  jade-950: "oklch(20% 0.04 175)"
  primary-foreground: "oklch(98% 0.005 215)"
  destructive: "oklch(57.7% 0.245 27.325)"
  destructive-text: "oklch(70.4% 0.191 22.216)"
typography:
  display:
    fontFamily: "Newsreader Variable, Iowan Old Style, Georgia, serif"
    fontSize: "clamp(1.75rem, 1.4rem + 1.2vw, 2.375rem)"
    lineHeight: 1.1
    letterSpacing: "-0.015em"
    fontFeature: '"calt", "liga", "kern"'
    fontVariation: '"opsz" 72'
  headline:
    fontFamily: "Newsreader Variable, Iowan Old Style, Georgia, serif"
    fontSize: "1.5rem"
    letterSpacing: "-0.015em"
    fontVariation: '"opsz" 72'
  title:
    fontFamily: "Newsreader Variable, Iowan Old Style, Georgia, serif"
    fontSize: "1.125rem"
    letterSpacing: "-0.015em"
    fontVariation: '"opsz" 72'
  body:
    fontFamily: "Hanken Grotesk Variable, -apple-system, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    fontFeature: '"ss01", "cv11"'
  label:
    fontFamily: "Hanken Grotesk Variable, -apple-system, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    fontFeature: '"ss01", "cv11"'
  eyebrow:
    fontFamily: "Hanken Grotesk Variable, -apple-system, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 500
    letterSpacing: "0.14em"
  mono:
    fontFamily: "ui-monospace, SF Mono, Cascadia Mono, JetBrains Mono, Consolas, monospace"
    fontSize: "0.75rem"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.jade-600}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "32px"
  button-primary-hover:
    backgroundColor: "{colors.jade-500}"
  button-ghost:
    backgroundColor: "{colors.ink-800}"
    textColor: "{colors.ink-500}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "32px"
  button-icon:
    backgroundColor: "{colors.ink-800}"
    textColor: "{colors.ink-500}"
    rounded: "{rounded.md}"
    size: "32px"
  input:
    backgroundColor: "{colors.ink-800}"
    textColor: "{colors.ink-100}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 8px"
    height: "32px"
  segmented-option:
    backgroundColor: "{colors.ink-800}"
    textColor: "{colors.ink-300}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  segmented-option-active:
    backgroundColor: "{colors.jade-600}"
    textColor: "{colors.ink-50}"
  nav-item:
    textColor: "{colors.ink-500}"
    rounded: "{rounded.md}"
    padding: "0 8px"
    height: "38px"
  nav-item-active:
    backgroundColor: "{colors.ink-800}"
    textColor: "{colors.ink-100}"
  tab:
    textColor: "{colors.ink-500}"
    typography: "{typography.body}"
    height: "52px"
  tab-active:
    textColor: "{colors.jade-400}"
  chip:
    textColor: "{colors.jade-300}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "2px 4px 2px 8px"
  menu:
    backgroundColor: "{colors.ink-800}"
    textColor: "{colors.ink-100}"
    rounded: "{rounded.lg}"
    padding: "4px"
  menu-item:
    textColor: "{colors.ink-200}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "6px 8px"
  dialog:
    backgroundColor: "{colors.ink-900}"
    textColor: "{colors.ink-100}"
    rounded: "{rounded.xl}"
    width: "448px"
  manga-card:
    backgroundColor: "{colors.ink-900}"
    rounded: "{rounded.lg}"
    width: "160px"
  reader-toolbar:
    backgroundColor: "{colors.ink-900}"
    textColor: "{colors.ink-100}"
    padding: "10px 16px"
---

# Design System: Ace Manga Reader

## Overview

**Creative North Star: "The Lamplit Study"**

A dark, quiet room where only the page is lit. Every surface outside the artwork is furniture: cool, low, and still, so the eye settles on covers in the library and on the page in the reader. The chrome exists to be stopped noticing; within a minute of reading it should have dissolved into the dark.

The world is built from two materials. Sumi Ink, a cool 215° tinted neutral that is never pure gray, makes up every surface, border, and line of text. Seal Jade, a 175° teal, is the lamp: it marks the one thing that is active, selected, or ready to act, and appears nowhere else. Type pairs a book serif (Newsreader, pinned to its display optical size) for titles with a precise humanist sans (Hanken Grotesk) for all interface text, so titles read like a spine on a shelf and controls read like a native desktop tool.

Density is comfortable but not airy. The manga grid is the densest surface; toolbars and menus are spaced for confident mouse use without feeling like a mobile app. Motion is short (200ms or less) and only reports a change of state. It must feel like a native desktop app, never a website in a window, and it explicitly rejects generic Material/Bootstrap dashboards, Calibre-style cluttered toolbars, and kawaii anime styling (pastel gradients, mascots, sparkles, rounded-everything).

**Key Characteristics:**

- Dark-only today; semantic tokens sit on top of the scales so a light theme can be layered under `[data-theme="light"]` without touching dark.
- One accent, used sparingly: Seal Jade marks state, never decoration.
- Flat tonal layering at rest; shadows only for floating layers and state.
- Serif titles, sans everything else, tabular numerals for counts; mono only for paths.
- lucide-solid line icons only; no emoji, no illustration.
- Short, direction-aware motion; shimmer skeletons for loading.

## Colors

A near-monochrome cool ink range with a single jade seal mark and a reserved red for destruction.

### Primary

- **Seal Jade** (`jade-600`): the filled accent. Primary buttons, the continue-reading play button, the active segmented option, the "new" and read-count progress badge, the library bookmark badge. White-ish foreground (`primary-foreground`) on top.
- **Lit Jade** (`jade-500`): hover for filled jade, focus rings, checked checkbox fills, the active tab underline, and selection marks on covers.
- **Pale Jade** (`jade-400` / `jade-300`): jade as text. Active tab label, hover on eyebrow actions (`jade-400`), and chip text on a `jade-500` at 15% wash with a 30% inset ring (`jade-300`).
- **Deep Jade** (`jade-700` to `jade-950`): selection ring on cards (`jade-700`) and tinted shadow under the active segmented option (`jade-950` at 40%).

### Neutral

- **Night Ink** (`ink-950`): the app background and the reader backdrop; the darkest surface, behind everything.
- **Desk Ink** (`ink-900`): raised panels. Side nav, reader toolbar, dialogs, comfortable and list manga cards.
- **Shelf Ink** (`ink-800`): controls and floating layers. Ghost buttons, inputs, menus, cover placeholders, active nav item, skeleton base, structural borders on `ink-900` panels.
- **Rule Ink** (`ink-700`): borders and inputs on `ink-800`, menu item highlight (at 70%), skeleton shimmer peak.
- **Faint Ink** (`ink-600`): unchecked checkbox borders, placeholder glyphs.
- **Quiet Ink** (`ink-500`): secondary text, metadata, inactive nav and tab labels, eyebrows.
- **Soft Ink** (`ink-300` / `ink-200`): hover text on inactive controls, menu item text.
- **Paper Ink** (`ink-100` / `ink-50`): primary text; `ink-50` on highlighted menu items.

### Destructive

- **Seal Red** (`destructive`, Tailwind `red-600`): destructive fills.
- **Warning Red** (`destructive-text`, Tailwind `red-400`): destructive menu items and error text; `red-950` at 20–40% with a `red-900` 30% border for error panels. Red is the only stock Tailwind scale permitted.

### Named Rules

**The Single Lamp Rule.** Seal Jade marks what is active, selected, or the one primary action, and nothing else. No jade borders at rest, no jade headings, no jade decoration. If two jade fills compete in one view, one of them is wrong.

**The Tinted Ink Rule.** Every neutral is an `ink-*` step. Never stock `zinc`, `gray`, `slate`, or `neutral`, and never a pure `#000`-derived gray for a surface. Black and white appear only as overlays and scrims on top of cover artwork, where they need to read against arbitrary images.

## Typography

**Display Font:** Newsreader Variable (with Iowan Old Style, Georgia, serif)
**Body Font:** Hanken Grotesk Variable (with -apple-system, system-ui, sans-serif)
**Mono Font:** ui-monospace chain, for file paths, extensions, and folder-structure examples only

**Character:** A book serif with its optical-size axis pinned to display (opsz 72) gives titles the feel of a printed spine; Hanken Grotesk, with `ss01` and `cv11` alternates on, keeps every control crisp and native. The contrast is the brand: literary where something is named, functional everywhere else.

### Hierarchy

- **Display** (Newsreader, fluid 28–38px, line-height 1.1, -0.015em): view-level hero titles only. The manga title on the detail view, and the headline of an empty state.
- **Headline** (Newsreader, 24px): settings section headings.
- **Title** (Newsreader, 18px): dialog titles.
- **Body** (Hanken Grotesk 400/500, 14px): the dominant UI size. Toolbar labels, list items, menu items, buttons, inputs, manga titles in list mode. 16px is reserved for readable prose.
- **Label** (Hanken Grotesk 500, 12px): captions, secondary metadata, segmented options, chips, card chapter counts (cards drop to ~11–13px for titles under covers).
- **Eyebrow** (Hanken Grotesk 500–600, 11px, 0.12–0.2em tracking, uppercase): small section labels inside menus and panels, always in Quiet Ink.
- **Micro** (Hanken Grotesk, 11px, tabular-nums): badges on covers ("new", "done", read/total).

### Named Rules

**The Spine Rule.** Newsreader names things: a view's subject, a settings section, a dialog. It never labels a control, a button, a menu item, or metadata.

**The Two-Weight Rule.** UI text lives at 500 (medium) for anything interactive or titled and 400 for supporting text. Semibold is for small headings in menus and toolbars; bold is effectively unused.

## Layout

A fixed desktop shell: a 52px icon rail on the left (expands to 180px on toggle, 200ms), then the main area. The reader view removes the rail entirely and fills the window.

- **Manga grid:** `auto-fill` columns at a fixed cover width (`--cover-w`, default 160px, adjustable per view) with `space-evenly` distribution, 32px row gap, 16px column gap, 16px padding. Covers are always 2:3 (height = 1.5 × width). Compact and cover-only modes fix the row height to the cover; comfortable rows grow with two-line titles.
- **List mode:** a vertical stack with 2px gaps and 8px padding; rows use a 48×64px cover thumbnail.
- **Toolbars:** a single 10px × 16px padded row with an `ink-800` bottom rule; controls are 32px tall.
- **Spacing rhythm:** Tailwind's 4px base. 4/6/8px inside controls, 12px between related controls, 16px panel padding, 32px between grid rows.
- **Responsive:** the window is the breakpoint. The grid reflows by column count; nothing switches into a mobile layout.
- **Reader:** content-first, edge to edge. Tap zones are thirds (left/center/right, or top/center/bottom in vertical and webtoon) with chevron cursors. Webtoon side padding is user-set from 0 to 25%.

## Elevation & Depth

Flat at rest. Depth comes from tonal steps: Night Ink (950) is the floor, Desk Ink (900) is a raised panel, Shelf Ink (800) is a control or floating layer, and a one-step-lighter `ink-*` border separates them. Shadows exist only for two reasons: something is floating above the page (menus, dialogs, popovers), or something is responding to the pointer (a cover lifting on hover). Small badges on cover art carry a soft shadow so they stay legible on any image.

### Shadow Vocabulary

- **Float** (`box-shadow: 0 25px 50px -12px oklch(12% 0.012 215 / 0.7)`, Tailwind `shadow-2xl shadow-ink-950/70`): menus, dialogs, popovers. Menus add a 1px `ink-950` 40% ring.
- **Lift** (`box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.5), 0 8px 10px -6px rgb(0 0 0 / 0.5)`, Tailwind `shadow-xl shadow-black/50`): manga cards on hover, paired with a 4px upward translate over 150ms.
- **Badge** (Tailwind `shadow-md`): badges, selection marks, and the continue button sitting on cover art.

### Named Rules

**The Flat-At-Rest Rule.** No card, panel, or button carries a shadow in its resting state. If a resting surface needs separation, step its ink tone or add an `ink-*` border.

## Shapes

Softly squared, never pill-shaped by default. Controls, inputs, menu items, nav items, and chips use a gentle 6px radius (`rounded-md`); cards and menus use 8px (`rounded-lg`); dialogs are the softest at 12px (`rounded-xl`). Small badges and checkboxes tighten to 3–4px. Full rounding is reserved for genuinely circular things: count pills on tabs, the library bookmark dot, scrollbar thumbs, and the tab indicator. Borders are 1px and tonal. Cover art is always clipped to its card's radius.

## Components

### Buttons

Quiet and compact; the button never competes with the cover beside it.

- **Shape:** gently squared (6px), 32px tall, 12px horizontal padding; icon-only buttons are 32×32.
- **Primary:** Seal Jade fill (`jade-600`) with near-white text, medium 14px. Used for the single main action in a view and for the continue-reading play button on covers.
- **Hover / Focus:** primary brightens to Lit Jade (`jade-500`); color transitions only, no movement. Focus shows a 2px Lit Jade ring via `:focus-visible`.
- **Ghost (default):** Shelf Ink fill (`ink-800`) with Quiet Ink text; on hover the fill drops to 80% and text rises to Paper Ink. Disabled is 50% opacity.

### Segmented Control

- **Style:** a wrapping row of 6px-radius options with 6px gaps, 12px medium labels.
- **State:** inactive options are Shelf Ink with Soft Ink text, brightening to `ink-700` on hover; the active option is a Seal Jade fill with white text and a faint `jade-950` shadow.

### Chips

- **Style:** a jade wash (`jade-500` at 15%) with a 1px inset `jade-500` 30% ring and Pale Jade (`jade-300`) text, 6px radius, 12px medium. A small remove button sits inside at the trailing edge.
- **State:** chips represent chosen values (e.g., selected categories); they do not toggle.

### Cards / Containers

The manga card is the system's signature surface: the cover is the content, the card is a frame.

- **Corner Style:** 8px, cover clipped inside.
- **Background:** Desk Ink (`ink-900`) for comfortable and list modes; Shelf Ink (`ink-800`) behind cover-only and compact covers and as the missing-cover placeholder.
- **Shadow Strategy:** none at rest; Lift on hover with a 4px rise (see Elevation).
- **Border:** none.
- **Internal Padding:** 8px × 6px under the cover in comfortable mode; titles clamp to two lines.
- **Overlays:** progress badge top-left (split jade/ink read-count tab with an angled clip), library bookmark top-right on a 70% black scrim, continue button bottom-right, selection mark and a 2px inset `jade-700` ring with a 10% jade wash when selected. Compact mode overlays the title on an 80% black-to-transparent gradient.

### Inputs / Fields

- **Style:** 32px tall, 6px radius, 1px `ink-700` border on a Shelf Ink fill, 14px Paper Ink text, Quiet Ink placeholder.
- **Focus:** the border shifts to Lit Jade; no glow, no ring.
- **Disabled:** 50% opacity, not-allowed cursor.

### Menus & Dialogs

- **Menus:** Shelf Ink, 8px radius, 4px inner padding, `ink-700` 70% border, Float shadow. Items are 6px-radius rows (6px × 8px padding) in Soft Ink, highlighting to `ink-700` 70% with `ink-50` text. Separators are 1px `ink-700` 60%. Destructive items use Warning Red text. Eyebrow labels sit at the top of grouped sections.
- **Dialogs:** Desk Ink, 12px radius, max 448px wide, `ink-700` 70% border, Float shadow, over a Night Ink 70% scrim with a 1px backdrop blur. Enter animation: 180ms fade with a 6px rise and 0.98→1 scale on a `cubic-bezier(0.16, 1, 0.3, 1)` curve. Titles use the Newsreader title role.

### Navigation

- **Side rail:** Desk Ink with a Shelf Ink right border; 22px icon boxes holding 18px lucide icons; 38px-tall, 6px-radius items. Inactive items are Quiet Ink, hovering to Soft Ink over Shelf Ink at 60%; the active item is a Shelf Ink fill with Paper Ink text. Labels fade in (150ms) as the rail expands (200ms).
- **Tabs:** 52px-tall triggers, 14px medium, Quiet Ink hovering to Soft Ink; the selected tab turns Pale Jade (`jade-400`) with a 2px rounded Lit Jade underline that slides between tabs. Count pills sit inside the trigger (`ink-700` when active, `ink-800` otherwise). Tabs support right-click context menus.

### Reader Toolbar (signature)

A single Desk Ink strip with a Shelf Ink bottom rule: back action, chapter title (14px semibold, truncating), then mode controls whose current value is shown as a 12px label (reading mode, fit mode, webtoon padding %). It recedes so completely that the page below is the only lit thing on screen. Page turns slide direction-aware in 200ms ease-out; the page counter uses tabular sans numerals and turns into an inline jump-to-page field on click.

### Loading

Shimmer skeletons: an `ink-800 → ink-700 → ink-800` gradient sweeping over 1.4s, linear, infinite. Skeletons appear instantly in the shape of the content they replace.

## Do's and Don'ts

### Do:

- **Do** build every surface from `ink-*` steps: `ink-950` floor, `ink-900` panel, `ink-800` control, `ink-700` border.
- **Do** reserve Seal Jade (`jade-600` fill, `jade-500` ring/indicator, `jade-400` text) for active, selected, focused, or the single primary action.
- **Do** use Newsreader only for view titles, settings sections, and dialog titles; everything else is Hanken Grotesk.
- **Do** keep motion at 200ms or less, ease-out, and only to report a change of state (page turn, open, select, hover lift).
- **Do** use `tabular-nums` for every count and page number.
- **Do** use lucide-solid icons at 16–18px in toolbars and the rail, 12–14px on cover overlays.
- **Do** show focus with a 2px Lit Jade `:focus-visible` ring or a jade border shift on inputs.

### Don't:

- **Don't** use stock Tailwind neutrals or accents (`zinc`, `gray`, `slate`, `indigo`, `blue`); red is the only stock scale permitted, and only for destructive or error states.
- **Don't** put shadows on resting cards, panels, or buttons; Float is for floating layers, Lift is for hover.
- **Don't** introduce a second accent color, gradients on chrome, or decorative glows.
- **Don't** use web idioms: hero sections, marketing cards, CTA banners, link-blue underlines, breadcrumb chevrons.
- **Don't** use emoji, mascots, sparkles, pastel gradients, or pill-shaped everything.
- **Don't** add bouncy springs, parallax, or motion that performs rather than informs.
- **Don't** place anything over the reader page that isn't summoned by the user.
