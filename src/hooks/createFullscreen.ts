import { createSignal, onCleanup, onMount } from "solid-js";

import { getCurrentWindow } from "@tauri-apps/api/window";

/**
 * Window fullscreen toggle for the reader. `isFullscreen` mirrors the real
 * window state: it is read on mount and re-synced on every resize, so exits
 * triggered outside `toggle` (OS shortcuts, window manager) stay in sync.
 * `exit` leaves fullscreen on the way out (used by the back navigation).
 */
export function createFullscreen() {
  const [isFullscreen, setIsFullscreen] = createSignal(false);

  onMount(() => {
    const win = getCurrentWindow();
    const sync = () => {
      void win.isFullscreen().then(setIsFullscreen);
    };
    sync();

    let disposed = false;
    let unlisten: (() => void) | undefined;
    void win.onResized(sync).then((fn) => {
      if (disposed) fn();
      else unlisten = fn;
    });

    onCleanup(() => {
      disposed = true;
      unlisten?.();
    });
  });

  async function toggle() {
    const win = getCurrentWindow();
    const full = await win.isFullscreen();
    await win.setFullscreen(!full);
    setIsFullscreen(!full);
  }

  function exit() {
    if (isFullscreen()) void getCurrentWindow().setFullscreen(false);
  }

  return { isFullscreen, toggle, exit };
}
