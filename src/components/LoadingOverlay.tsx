import { Show, createSignal, createEffect, onCleanup } from "solid-js";
import { Loader2 } from "lucide-solid";
import { useViewLoading } from "../context/ViewLoadingContext";

/**
 * Page-level loader overlay for views with multi-source async data.
 *
 * Two-signal pattern (`mounted` + `visible`):
 *   - `mounted` controls DOM presence, gated by an appearance delay so
 *     fast loads (cache hits) never paint the spinner at all.
 *   - `visible` controls opacity, flipped on the next frame after mount
 *     so the CSS transition has a 0→1 edge to animate against.
 *
 * Without the rAF gap, the element would mount with opacity:1 already
 * applied and the transition would never run.
 */

const APPEAR_DELAY_MS = 150;
const FADE_MS = 180;

export function LoadingOverlay() {
  const { isBusy } = useViewLoading();
  const [mounted, setMounted] = createSignal(false);
  const [visible, setVisible] = createSignal(false);

  let appearTimer: number | undefined;
  let unmountTimer: number | undefined;

  function clearTimers() {
    if (appearTimer !== undefined) {
      clearTimeout(appearTimer);
      appearTimer = undefined;
    }
    if (unmountTimer !== undefined) {
      clearTimeout(unmountTimer);
      unmountTimer = undefined;
    }
  }

  createEffect(() => {
    if (isBusy()) {
      // A new busy phase started — cancel any pending unmount and
      // (re-)schedule the appearance.
      if (unmountTimer !== undefined) {
        clearTimeout(unmountTimer);
        unmountTimer = undefined;
      }
      if (mounted()) {
        // Already showing from a previous busy phase — keep it up.
        setVisible(true);
        return;
      }
      if (appearTimer === undefined) {
        appearTimer = window.setTimeout(() => {
          appearTimer = undefined;
          setMounted(true);
          requestAnimationFrame(() => setVisible(true));
        }, APPEAR_DELAY_MS);
      }
    } else {
      // Busy ended — cancel a pending appearance, fade out if mounted.
      if (appearTimer !== undefined) {
        clearTimeout(appearTimer);
        appearTimer = undefined;
      }
      if (mounted()) {
        setVisible(false);
        unmountTimer = window.setTimeout(() => {
          setMounted(false);
          unmountTimer = undefined;
        }, FADE_MS);
      }
    }
  });

  onCleanup(clearTimers);

  return (
    <Show when={mounted()}>
      <div
        class="absolute inset-0 z-50 flex items-center justify-center bg-ink-950"
        style={{
          opacity: visible() ? 1 : 0,
          transition: `opacity ${FADE_MS}ms ease-out`,
        }}
        aria-busy="true"
        aria-live="polite"
      >
        <Loader2 size={32} class="text-jade-500 animate-spin" />
      </div>
    </Show>
  );
}
