import {
  ArrowDownUp,
  BookOpen,
  BookOpenCheck,
  Fullscreen,
  Maximize,
  MoveHorizontal,
  MoveVertical,
  ScanEye,
  Scroll,
} from "lucide-solid";

import type { FitMode, ReadingMode } from "~/types";

// ── Fit modes (paged only) ─────────────────────────────────────────
export const FIT_MODES: FitMode[] = [
  "fit-screen",
  "fit-width",
  "fit-height",
  "original",
  "stretch",
];

export const FIT_LABELS: Record<FitMode, string> = {
  "fit-screen": "Fit Screen",
  "fit-width": "Fit Width",
  "fit-height": "Fit Height",
  original: "Original",
  stretch: "Stretch",
};

export const FIT_CLASSES: Record<FitMode, string> = {
  "fit-screen": "max-h-full max-w-full object-contain",
  "fit-width": "w-full h-auto object-contain",
  "fit-height": "h-full w-auto max-w-none object-contain",
  original: "max-w-none",
  stretch: "w-full h-full object-fill",
};

export const FIT_ICONS: Record<FitMode, typeof Maximize> = {
  "fit-screen": Maximize,
  "fit-width": MoveHorizontal,
  "fit-height": MoveVertical,
  original: ScanEye,
  stretch: Fullscreen,
};

// ── Reading modes ──────────────────────────────────────────────────
export const READING_MODES: ReadingMode[] = [
  "paged-rtl",
  "paged-ltr",
  "paged-vertical",
  "webtoon",
];

export const READING_LABELS: Record<ReadingMode, string> = {
  "paged-ltr": "Paged LTR",
  "paged-rtl": "Paged RTL",
  "paged-vertical": "Paged Vertical",
  webtoon: "Webtoon",
};

export const READING_ICONS: Record<ReadingMode, typeof BookOpen> = {
  "paged-ltr": BookOpen,
  "paged-rtl": BookOpenCheck,
  "paged-vertical": ArrowDownUp,
  webtoon: Scroll,
};

// ── Helpers ─────────────────────────────────────────────────────────
/** Return the element after `current` in `list`, wrapping to the start. */
export function cycle<T>(list: readonly T[], current: T): T {
  return list[(list.indexOf(current) + 1) % list.length];
}

export type SlideDir = "left" | "right" | "up" | "down";

/** Page-flip direction for the slide animation, by reading mode. In RTL the
 * visual order is mirrored; vertical flips along the Y axis. */
export function slideDir(mode: ReadingMode, action: "prev" | "next"): SlideDir {
  if (mode === "paged-vertical") return action === "next" ? "up" : "down";
  if (mode === "paged-rtl") return action === "next" ? "right" : "left";
  return action === "next" ? "left" : "right";
}
