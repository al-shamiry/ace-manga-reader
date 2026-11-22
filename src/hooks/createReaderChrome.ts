import {
  type Accessor,
  createEffect,
  createSignal,
  on,
  onCleanup,
} from "solid-js";

type ReaderChromeOptions = {
  isFullscreen: Accessor<boolean>;
  /** While true, a peek never times out (e.g. the jump input is open). */
  keepOpen?: Accessor<boolean>;
};

// Fraction of the window height at the top/bottom edge that reveals hidden bars.
const EDGE_RATIO = 0.1;
// Idle time before a peek re-hides and the cursor disappears.
const IDLE_MS = 2000;
// Wrappers marked with this attribute count as "over a bar" (keeps a peek open).
const BAR_SELECTOR = "[data-reader-bar]";

/**
 * Visibility of the reader's overlay bars (toolbar + bottom bar + title bar).
 * `hidden` is the user's explicit choice; `visible` is the derived state the
 * view renders from (`!hidden || peek`).
 *
 * Fullscreen is transient: entering snapshots `hidden` and forces it on,
 * exiting restores the snapshot. `toggle` still works inside fullscreen.
 *
 * While hidden, moving the pointer into the top/bottom edge zone peeks the
 * bars in; they re-hide IDLE_MS after the pointer leaves the zone and the
 * bars. The cursor hides after IDLE_MS without movement.
 */
export function createReaderChrome(opts: ReaderChromeOptions) {
  const [hidden, setHidden] = createSignal(false);
  const [peek, setPeek] = createSignal(false);
  const [cursorIdle, setCursorIdle] = createSignal(false);

  let hiddenBeforeFullscreen: boolean | undefined;
  let peekTimer: ReturnType<typeof setTimeout> | undefined;
  let cursorTimer: ReturnType<typeof setTimeout> | undefined;
  let overBar = false;
  // After hiding, the pointer is often still in the edge zone (e.g. it just
  // clicked the hide button). Ignore the zone until the pointer leaves it once.
  let armed = true;

  const visible = () => !hidden() || peek();

  createEffect(
    on(
      opts.isFullscreen,
      (full) => {
        if (full) {
          hiddenBeforeFullscreen = hidden();
          setHidden(true);
        } else if (hiddenBeforeFullscreen !== undefined) {
          setHidden(hiddenBeforeFullscreen);
          hiddenBeforeFullscreen = undefined;
        }
      },
      { defer: true },
    ),
  );

  // Any change of the user's choice drops a pending peek.
  createEffect(
    on(
      hidden,
      (h) => {
        endPeek();
        if (h) armed = false;
      },
      { defer: true },
    ),
  );

  function endPeek() {
    clearTimeout(peekTimer);
    peekTimer = undefined;
    setPeek(false);
  }

  function schedulePeekEnd() {
    clearTimeout(peekTimer);
    peekTimer = setTimeout(() => {
      peekTimer = undefined;
      if (overBar || opts.keepOpen?.()) schedulePeekEnd();
      else setPeek(false);
    }, IDLE_MS);
  }

  function onMouseMove(e: MouseEvent) {
    setCursorIdle(false);
    clearTimeout(cursorTimer);
    cursorTimer = setTimeout(() => setCursorIdle(true), IDLE_MS);

    overBar =
      e.target instanceof Element && e.target.closest(BAR_SELECTOR) !== null;
    if (!hidden()) return;

    const edge = window.innerHeight * EDGE_RATIO;
    const inZone = e.clientY <= edge || e.clientY >= window.innerHeight - edge;
    if (!inZone) armed = true;

    if ((inZone && armed) || (peek() && overBar)) {
      setPeek(true);
      schedulePeekEnd();
    } else if (peek() && peekTimer === undefined) {
      schedulePeekEnd();
    }
  }

  function onMouseLeave() {
    overBar = false;
  }

  window.addEventListener("mousemove", onMouseMove);
  document.documentElement.addEventListener("mouseleave", onMouseLeave);
  onCleanup(() => {
    window.removeEventListener("mousemove", onMouseMove);
    document.documentElement.removeEventListener("mouseleave", onMouseLeave);
    clearTimeout(peekTimer);
    clearTimeout(cursorTimer);
  });

  function toggle() {
    setHidden((h) => !h);
  }
  function show() {
    setHidden(false);
  }
  function hide() {
    setHidden(true);
  }

  return { hidden, visible, cursorIdle, toggle, show, hide };
}
