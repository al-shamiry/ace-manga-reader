import { Show, For, createSignal } from "solid-js";
import { LayoutGrid } from "lucide-solid";
import type { DisplayMode, LibraryDisplay } from "../types";

interface Props {
  display: LibraryDisplay;
  onChange: (display: LibraryDisplay) => void;
}

const DISPLAY_MODES: { value: DisplayMode; label: string }[] = [
  { value: "compact", label: "Compact grid" },
  { value: "comfortable", label: "Comfortable grid" },
  { value: "cover-only", label: "Cover-only grid" },
  { value: "list", label: "List" },
];

export function DisplayOptionsPopover(props: Props) {
  const [open, setOpen] = createSignal(false);

  function setMode(mode: DisplayMode) {
    props.onChange({ ...props.display, display_mode: mode });
  }

  return (
    <div class="relative">
      <button
        class="flex items-center justify-center w-8 h-8 rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors cursor-pointer"
        onClick={() => setOpen(!open())}
        title="Display options"
      >
        <LayoutGrid size={16} />
      </button>

      <Show when={open()}>
        <div class="fixed inset-0 z-40" onClick={() => setOpen(false)} />
        <div class="absolute right-0 top-10 z-50 w-56 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-2">
          {/* Display mode */}
          <div class="px-3 pb-2">
            <p class="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Display mode</p>
            <div class="grid grid-cols-2 gap-1.5">
              <For each={DISPLAY_MODES}>
                {(mode) => {
                  const isActive = () => props.display.display_mode === mode.value;
                  return (
                    <button
                      class="px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer"
                      classList={{
                        "bg-indigo-600 text-white": isActive(),
                        "bg-zinc-700 text-zinc-300 hover:bg-zinc-600": !isActive(),
                      }}
                      onClick={() => setMode(mode.value)}
                    >
                      {mode.label}
                    </button>
                  );
                }}
              </For>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}
