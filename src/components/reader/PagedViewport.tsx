import { Show } from "solid-js";

import { convertFileSrc } from "@tauri-apps/api/core";

import type { FitMode } from "~/types";

import { FIT_CLASSES, type SlideDir } from "~/lib/reader-modes";

type PagedViewportProps = {
  pages: string[];
  pageIndex: number;
  fitMode: FitMode;
  anim: { prevIdx: number; dir: SlideDir } | null;
  onClearAnim: () => void;
  isVertical: boolean;
  onTapLeft: () => void;
  onTapRight: () => void;
  onPrev: () => void;
  onNext: () => void;
  setPageContainer: (el: HTMLDivElement) => void;
};

export function PagedViewport(props: PagedViewportProps) {
  function pageContainerClass() {
    if (props.anim)
      return `absolute inset-0 flex items-center justify-center overflow-hidden slide-in-${props.anim.dir}`;
    const fm = props.fitMode;
    const overflow =
      fm === "original" || fm === "fit-width" || fm === "fit-height"
        ? "overflow-auto"
        : "overflow-hidden";
    return `absolute inset-0 flex items-center justify-center ${overflow}`;
  }

  return (
    <div class="relative flex-1 overflow-hidden">
      {/* Outgoing page (only during animation) */}
      <Show when={props.anim}>
        {(a) => (
          <div
            class={`absolute inset-0 flex items-center justify-center overflow-hidden slide-out-${a().dir}`}
          >
            <img
              src={convertFileSrc(props.pages[a().prevIdx])}
              alt="Previous page"
              class={`select-none ${FIT_CLASSES[props.fitMode]}`}
              draggable={false}
            />
          </div>
        )}
      </Show>
      {/* Current page */}
      <div
        ref={props.setPageContainer}
        class={pageContainerClass()}
        onAnimationEnd={() => props.onClearAnim()}
      >
        <Show when={props.pages[props.pageIndex]} keyed>
          {(src) => (
            <img
              src={convertFileSrc(src)}
              alt={`Page ${props.pageIndex + 1}`}
              class={`select-none ${FIT_CLASSES[props.fitMode]}`}
              draggable={false}
            />
          )}
        </Show>
      </div>
      {/* Tap zones — direction depends on mode */}
      <Show
        when={props.isVertical}
        fallback={
          /* Horizontal tap zones (LTR / RTL) */
          <div class="pointer-events-none absolute inset-0 z-10 flex">
            <div
              class="cursor-left pointer-events-auto h-full w-1/3"
              onClick={() => props.onTapLeft()}
            />
            <div class="h-full w-1/3" />
            <div
              class="cursor-right pointer-events-auto h-full w-1/3"
              onClick={() => props.onTapRight()}
            />
          </div>
        }
      >
        {/* Vertical tap zones */}
        <div class="pointer-events-none absolute inset-0 z-10 flex flex-col">
          <div
            class="cursor-up pointer-events-auto h-1/3 w-full"
            onClick={() => props.onPrev()}
          />
          <div class="h-1/3 w-full" />
          <div
            class="cursor-down pointer-events-auto h-1/3 w-full"
            onClick={() => props.onNext()}
          />
        </div>
      </Show>
    </div>
  );
}
