import { For } from "solid-js";
import { LayoutGrid } from "lucide-solid";
import { Popover, PopoverTrigger, PopoverContent } from "./ui/popover";
import { Slider, SliderTrack, SliderFill, SliderThumb } from "./ui/slider";
import { Checkbox } from "./ui/checkbox";
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
  function setMode(mode: DisplayMode) {
    props.onChange({ ...props.display, display_mode: mode });
  }

  function setCardSize(values: number[]) {
    props.onChange({ ...props.display, card_size: values[0] });
  }

  function toggle(key: keyof LibraryDisplay) {
    props.onChange({ ...props.display, [key]: !props.display[key] });
  }

  return (
    <Popover>
      <PopoverTrigger
        class="flex items-center justify-center w-8 h-8 rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors cursor-pointer"
        title="Display options"
      >
        <LayoutGrid size={16} />
      </PopoverTrigger>

      <PopoverContent class="w-64 py-2">
        {/* Display mode */}
        <div class="px-3 pb-3">
          <p class="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
            Display mode
          </p>
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

        {/* Card size */}
        <div class="px-3 pt-1 pb-2 border-t border-zinc-700/60">
          <p class="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2 mt-2">
            Card size
          </p>
          <div class="flex items-center gap-2">
            <span class="text-[0.7rem] text-zinc-500 shrink-0">Small</span>
            <Slider
              minValue={1}
              maxValue={15}
              step={1}
              value={[props.display.card_size]}
              onChange={setCardSize}
              class="flex-1"
            >
              <SliderTrack>
                <SliderFill />
                <SliderThumb />
              </SliderTrack>
            </Slider>
            <span class="text-[0.7rem] text-zinc-500 shrink-0">Large</span>
          </div>
        </div>

        {/* Badges */}
        <div class="px-3 pt-1 pb-2 border-t border-zinc-700/60">
          <p class="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1 mt-2">
            Badges
          </p>
          <Checkbox
            checked={props.display.show_unread_badge}
            onChange={() => toggle("show_unread_badge")}
            label="Unread chapters"
          />
          <Checkbox
            checked={props.display.show_continue_button}
            onChange={() => toggle("show_continue_button")}
            label="Continue reading button"
          />
        </div>

        {/* Tabs */}
        <div class="px-3 pt-1 pb-2 border-t border-zinc-700/60">
          <p class="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1 mt-2">
            Tabs
          </p>
          <Checkbox
            checked={props.display.show_category_tabs}
            onChange={() => toggle("show_category_tabs")}
            label="Show category tabs"
          />
          <Checkbox
            checked={props.display.show_item_count}
            onChange={() => toggle("show_item_count")}
            label="Show number of items"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
