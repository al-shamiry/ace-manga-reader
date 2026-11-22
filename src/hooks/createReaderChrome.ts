import { createSignal } from "solid-js";

/**
 * Visibility of the reader's overlay bars (toolbar + bottom bar).
 * `hidden` is the user's explicit choice; `visible` is the derived state the
 * view renders from (later inputs such as fullscreen and edge peek feed in here).
 */
export function createReaderChrome() {
  const [hidden, setHidden] = createSignal(false);

  const visible = () => !hidden();

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
