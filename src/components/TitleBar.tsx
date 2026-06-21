import { createSignal, onCleanup, onMount } from "solid-js";

import { getCurrentWindow } from "@tauri-apps/api/window";
import { Copy, Minus, Square, X } from "lucide-solid";

export function TitleBar() {
  const win = getCurrentWindow();
  const [maximized, setMaximized] = createSignal(false);

  onMount(async () => {
    setMaximized(await win.isMaximized());
    const unlisten = await win.onResized(async () => {
      setMaximized(await win.isMaximized());
    });
    onCleanup(unlisten);
  });

  return (
    <div
      data-tauri-drag-region
      class="flex h-8 shrink-0 items-center border-b border-ink-800 bg-ink-900 select-none"
    >
      <div
        data-tauri-drag-region
        class="flex h-full flex-1 items-center pl-3 text-2xs font-medium tracking-[0.12em] text-ink-500 uppercase"
      >
        Ace Manga Reader
      </div>

      <div class="flex h-full items-stretch">
        <button
          onClick={() => win.minimize()}
          class="flex w-11.5 cursor-pointer items-center justify-center text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-100"
          title="Minimize"
        >
          <Minus size={14} strokeWidth={1.75} />
        </button>
        <button
          onClick={() => win.toggleMaximize()}
          class="flex w-11.5 cursor-pointer items-center justify-center text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-100"
          title={maximized() ? "Restore" : "Maximize"}
        >
          {maximized() ? (
            <Copy size={12} strokeWidth={1.75} />
          ) : (
            <Square size={11} strokeWidth={1.75} />
          )}
        </button>
        <button
          onClick={() => win.close()}
          class="flex w-11.5 cursor-pointer items-center justify-center text-ink-400 transition-colors hover:bg-red-600 hover:text-white"
          title="Close"
        >
          <X size={15} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
