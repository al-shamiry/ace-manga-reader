import { createSignal } from "solid-js";

import { getCurrentWindow } from "@tauri-apps/api/window";

/**
 * Window fullscreen toggle for the reader. `toggle` flips the OS window state
 * and mirrors it into the `isFullscreen` signal (for the toolbar icon);
 * `exit` leaves fullscreen on the way out (used by the back navigation).
 */
export function createFullscreen() {
  const [isFullscreen, setIsFullscreen] = createSignal(false);

  async function toggle() {
    const win = getCurrentWindow();
    const full = await win.isFullscreen();
    await win.setFullscreen(!full);
    setIsFullscreen(!full);
  }

  function exit() {
    if (isFullscreen()) getCurrentWindow().setFullscreen(false);
  }

  return { isFullscreen, toggle, exit };
}
