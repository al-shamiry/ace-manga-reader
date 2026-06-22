import { JSX } from "solid-js";

import { useViewLoading } from "~/context/ViewLoadingContext";

import { LoadingOverlay } from "./LoadingOverlay";

export type MainAreaProps = {
  children: JSX.Element;
};

/**
 * Main content area. Children stay mounted but are hidden via
 * `visibility: hidden` while a view is busy — the overlay alone is
 * insufficient because the appearance delay leaves a 0–150ms window
 * where the overlay isn't painted but the view is, briefly exposing
 * default/empty signal state. Hiding content covers that window
 * regardless of whether the spinner ever appears.
 *
 * `visibility: hidden` (vs `display: none`) preserves layout box so
 * dimension-dependent measurements still work, and (vs `opacity: 0`)
 * blocks pointer events and removes elements from the accessibility
 * tree.
 */
export function MainArea(props: MainAreaProps) {
  const view = useViewLoading();
  return (
    <main class="relative flex min-w-0 flex-1 flex-col overflow-hidden">
      <div
        class="flex min-w-0 flex-1 flex-col overflow-hidden"
        style={{ visibility: view.isBusy() ? "hidden" : "visible" }}
      >
        {props.children}
      </div>
      <LoadingOverlay />
    </main>
  );
}
