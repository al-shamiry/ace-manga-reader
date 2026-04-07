import { createSignal, onMount, onCleanup } from "solid-js";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, Copy, X } from "lucide-solid";


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
      class="flex items-center h-8 shrink-0 bg-ink-900 border-b border-ink-800 select-none"
    >
      <div
        data-tauri-drag-region
        class="flex-1 h-full flex items-center pl-3 text-2xs font-medium tracking-[0.12em] uppercase text-ink-500"
      >
        Ace Manga Reader
      </div>

      <div class="flex items-stretch h-full">
        <button
          onClick={() => win.minimize()}
          class="w-11.5 flex items-center justify-center text-ink-400 hover:bg-ink-800 hover:text-ink-100 transition-colors cursor-pointer"
          title="Minimize"
        >
          <Minus size={14} strokeWidth={1.75} />
        </button>
        <button
          onClick={() => win.toggleMaximize()}
          class="w-11.5 flex items-center justify-center text-ink-400 hover:bg-ink-800 hover:text-ink-100 transition-colors cursor-pointer"
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
          class="w-11.5 flex items-center justify-center text-ink-400 hover:bg-red-600 hover:text-white transition-colors cursor-pointer"
          title="Close"
        >
          <X size={15} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
