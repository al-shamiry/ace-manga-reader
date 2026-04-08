import type { JSX, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";

import * as ButtonPrimitive from "@kobalte/core/button";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";

import { cn } from "~/lib/utils";

/*
 * Toolbar — the view-level chrome band that sits directly under the
 * window title bar on every primary view (Library, History, Settings,
 * Source, MangaDetail, Sources). One height (h-13), one surface, one
 * gap rhythm, so navigating between views never shifts a pixel of
 * chrome.
 *
 * Composition:
 *   <Toolbar>
 *     <ToolbarBack onClick={...} label="Sources" />
 *     <ToolbarTitle>Source name</ToolbarTitle>
 *     <ToolbarSpacer />
 *     <ToolbarButton onClick={...} title="Refresh">
 *       <RefreshCw size={16} />
 *     </ToolbarButton>
 *   </Toolbar>
 *
 * The action-zone shape is also exported as `toolbarIconButtonClass`
 * so other component triggers (Kobalte dropdown triggers, the search
 * toggle, etc.) can opt in without re-importing the wrapper element.
 */

// ── Surface ────────────────────────────────────────────────────────────────

interface ToolbarProps {
  class?: string;
  children?: JSX.Element;
}

export function Toolbar(props: ToolbarProps) {
  return (
    <div
      class={cn(
        "flex h-13 shrink-0 items-center gap-2 border-b border-ink-800 bg-ink-900 px-4",
        props.class,
      )}
    >
      {props.children}
    </div>
  );
}

// ── Title ──────────────────────────────────────────────────────────────────
// One typographic treatment for "what view am I in" — small, tracked,
// uppercase, ink-500. Matches the existing History/Settings eyebrow so
// nothing visible changes there; SourceView's bold breadcrumb collapses
// into the same calmer pattern.

interface ToolbarTitleProps {
  class?: string;
  children?: JSX.Element;
}

export function ToolbarTitle(props: ToolbarTitleProps) {
  return (
    <p
      class={cn(
        "min-w-0 truncate text-xs font-medium uppercase tracking-[0.2em] text-ink-500",
        props.class,
      )}
    >
      {props.children}
    </p>
  );
}

// ── Spacer ─────────────────────────────────────────────────────────────────
// `flex-1` filler that pushes whatever follows to the trailing edge.
// Cleaner at call sites than hand-rolled `<div class="flex-1" />`.

export function ToolbarSpacer() {
  return <div class="flex-1" />;
}

// ── Action group ───────────────────────────────────────────────────────────
// Trailing cluster of icon buttons (Search/Sort/Filter etc.). Tight
// gap-1 so they read as a single zone and don't fight the toolbar gap.

export function ToolbarActions(props: { class?: string; children?: JSX.Element }) {
  return (
    <div class={cn("flex shrink-0 items-center gap-1", props.class)}>
      {props.children}
    </div>
  );
}

// ── Icon button class ──────────────────────────────────────────────────────
// Canonical shape for any 32px square action that lives inside a
// toolbar. Kobalte dropdown triggers, the search toggle, and the
// ToolbarButton wrapper all consume this so the hover/colour/radius
// stays bit-for-bit identical across surfaces.

export const toolbarIconButtonClass =
  "relative flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-ink-500 transition-colors hover:bg-ink-800 hover:text-ink-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade-500/60";

// ── Inline (icon + label) class ────────────────────────────────────────────
// Same family as the icon button, but wider so it can carry a short
// label like "Sources" or "Back". Used for the back-affordance on
// detail views.

export const toolbarInlineButtonClass =
  "inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade-500/60";

// ── Wrapped buttons (Kobalte-aware) ────────────────────────────────────────

type ToolbarButtonProps<T extends ValidComponent = "button"> =
  ButtonPrimitive.ButtonRootProps<T> & {
    class?: string | undefined;
    children?: JSX.Element;
  };

/** Square icon-only button (32x32) — the default toolbar action shape. */
export function ToolbarButton<T extends ValidComponent = "button">(
  props: PolymorphicProps<T, ToolbarButtonProps<T>>,
) {
  const [local, others] = splitProps(props as ToolbarButtonProps, ["class"]);
  return (
    <ButtonPrimitive.Root
      class={cn(toolbarIconButtonClass, local.class)}
      {...others}
    />
  );
}

/** Inline button — icon + short label, used for Back/breadcrumb affordances. */
export function ToolbarInlineButton<T extends ValidComponent = "button">(
  props: PolymorphicProps<T, ToolbarButtonProps<T>>,
) {
  const [local, others] = splitProps(props as ToolbarButtonProps, ["class"]);
  return (
    <ButtonPrimitive.Root
      class={cn(toolbarInlineButtonClass, local.class)}
      {...others}
    />
  );
}
