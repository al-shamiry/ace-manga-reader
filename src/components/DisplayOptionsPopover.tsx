import { For } from "solid-js";
import { LayoutGrid } from "lucide-solid";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuGroupLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "./ui/dropdown-menu";
import { Slider, SliderTrack, SliderFill, SliderThumb } from "./ui/slider";
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
    <DropdownMenu>
      <DropdownMenuTrigger
        class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        title="Display options"
      >
        <LayoutGrid size={16} />
      </DropdownMenuTrigger>

      <DropdownMenuContent class="w-64">
        <div class="px-2 pb-1 pt-2 text-sm font-semibold text-foreground">
          Display
        </div>
        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuGroupLabel>Display mode</DropdownMenuGroupLabel>
          <div class="grid grid-cols-2 gap-1.5 px-2 pb-2 pt-1">
            <For each={DISPLAY_MODES}>
              {(mode) => {
                const isActive = () => props.display.display_mode === mode.value;
                return (
                  <button
                    class="cursor-pointer rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors"
                    classList={{
                      "bg-primary text-primary-foreground": isActive(),
                      "bg-secondary text-secondary-foreground hover:bg-accent":
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
          <div class="flex items-center gap-2 px-2 pb-2 pt-1">
            <span class="shrink-0 text-[0.7rem] text-muted-foreground">Small</span>
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
            <span class="shrink-0 text-[0.7rem] text-muted-foreground">Large</span>
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
            Unread chapters
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={props.display.show_continue_button}
            onChange={() => toggle("show_continue_button")}
            closeOnSelect={false}
          >
            Continue reading button
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuGroupLabel>Tabs</DropdownMenuGroupLabel>
          <DropdownMenuCheckboxItem
            checked={props.display.show_category_tabs}
            onChange={() => toggle("show_category_tabs")}
            closeOnSelect={false}
          >
            Show category tabs
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={props.display.show_item_count}
            onChange={() => toggle("show_item_count")}
            closeOnSelect={false}
          >
            Show number of items
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
