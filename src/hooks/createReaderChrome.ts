import { type Accessor, createEffect, createSignal, on } from "solid-js";

type ReaderChromeOptions = {
  isFullscreen: Accessor<boolean>;
};

/**
 * Visibility of the reader's overlay bars (toolbar + bottom bar).
 * `hidden` is the user's explicit choice; `visible` is the derived state the
 * view renders from (edge peek feeds in here later).
 *
 * Fullscreen is transient: entering snapshots `hidden` and forces it on,
 * exiting restores the snapshot. `toggle` still works inside fullscreen.
 */
export function createReaderChrome(opts: ReaderChromeOptions) {
  const [hidden, setHidden] = createSignal(false);

  let hiddenBeforeFullscreen: boolean | undefined;

  const visible = () => !hidden();

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

  function toggle() {
    setHidden((h) => !h);
  }
  function show() {
    setHidden(false);
  }
  function hide() {
    setHidden(true);
  }

  return { hidden, visible, toggle, show, hide };
}
