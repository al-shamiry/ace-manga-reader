import { For, Show } from "solid-js";

import { LayoutGrid } from "lucide-solid";

import type { DisplayMode, LibraryDisplay } from "../types";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuGroupLabel,
  DropdownMenuHeader,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Slider, SliderFill, SliderThumb, SliderTrack } from "./ui/slider";
import { toolbarIconButtonClass } from "./ui/toolbar";

interface Props {
  display: LibraryDisplay;
  onChange: (display: LibraryDisplay) => void;
  showTabsSection?: boolean;
  defaults?: LibraryDisplay;
}

const DISPLAY_MODES: { value: DisplayMode; label: string }[] = [
  { value: "compact", label: "Compact grid" },
  { value: "comfortable", label: "Comfortable grid" },
  { value: "cover-only", label: "Cover-only grid" },
  { value: "list", label: "List" },
];

export const DEFAULT_LIBRARY_DISPLAY: LibraryDisplay = {
  display_mode: "comfortable",
  card_size: 8,
  show_unread_badge: false,
  show_continue_button: false,
  show_item_count: true,
};

export const DEFAULT_SOURCE_DISPLAY: LibraryDisplay = {
  ...DEFAULT_LIBRARY_DISPLAY,
  show_item_count: false,
};

function sameDisplay(a: LibraryDisplay, b: LibraryDisplay): boolean {
  return (
    a.display_mode === b.display_mode &&
    a.card_size === b.card_size &&
    a.show_unread_badge === b.show_unread_badge &&
    a.show_continue_button === b.show_continue_button &&
    a.show_item_count === b.show_item_count
  );
}

export function DisplayOptionsPopover(props: Props) {
  const defaults = () =>
    props.defaults ??
    ((props.showTabsSection ?? true)
      ? DEFAULT_LIBRARY_DISPLAY
      : DEFAULT_SOURCE_DISPLAY);
  const canReset = () => !sameDisplay(props.display, defaults());

  function setMode(mode: DisplayMode) {
    props.onChange({ ...props.display, display_mode: mode });
  }

  function setCardSize(values: number[]) {
    props.onChange({ ...props.display, card_size: values[0] });
  }

  function toggle(key: keyof LibraryDisplay) {
    props.onChange({ ...props.display, [key]: !props.display[key] });
  }

  function resetDisplay() {
    props.onChange(defaults());
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        class={toolbarIconButtonClass}
        title="Display options"
      >
        <LayoutGrid size={16} />
      </DropdownMenuTrigger>

      <DropdownMenuContent class="w-72">
        <DropdownMenuHeader onReset={resetDisplay} canReset={canReset()}>
          Display
        </DropdownMenuHeader>
        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuGroupLabel>Display mode</DropdownMenuGroupLabel>
          <div class="grid grid-cols-2 gap-1.5 px-2 pt-1 pb-2">
            <For each={DISPLAY_MODES}>
              {(mode) => {
                const isActive = () =>
                  props.display.display_mode === mode.value;
                return (
                  <button
                    class="cursor-pointer rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors"
                    classList={{
                      "border-jade-500/60 bg-jade-500/10 text-jade-300":
                        isActive(),
                      "border-transparent bg-ink-900/60 text-ink-300 hover:border-ink-700 hover:bg-ink-900 hover:text-ink-100":
                        !isActive(),
                    }}
                    onClick={() => setMode(mode.value)}
                  >
                    {mode.label}
                  </button>
                );
              }}
            </For>
          </div>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuGroupLabel>Card size</DropdownMenuGroupLabel>
          <div class="flex items-center gap-2 px-2 pt-1 pb-2">
            <span class="shrink-0 text-[0.7rem] tracking-[0.12em] text-ink-500 uppercase">
              Small
            </span>
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
            <span class="shrink-0 text-[0.7rem] tracking-[0.12em] text-ink-500 uppercase">
              Large
            </span>
          </div>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuGroupLabel>Badges</DropdownMenuGroupLabel>
          <DropdownMenuCheckboxItem
            checked={props.display.show_unread_badge}
            onChange={() => toggle("show_unread_badge")}
            closeOnSelect={false}
          >
            Chapter progress
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={props.display.show_continue_button}
            onChange={() => toggle("show_continue_button")}
            closeOnSelect={false}
          >
            Continue reading button
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>

        <Show when={props.showTabsSection ?? true}>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuGroupLabel>Tabs</DropdownMenuGroupLabel>
            <DropdownMenuCheckboxItem
              checked={props.display.show_item_count}
              onChange={() => toggle("show_item_count")}
              closeOnSelect={false}
            >
              Show number of items
            </DropdownMenuCheckboxItem>
          </DropdownMenuGroup>
        </Show>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
