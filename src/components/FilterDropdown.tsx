import { Show, For } from "solid-js";
import { SlidersHorizontal } from "lucide-solid";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuGroupLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "./ui/dropdown-menu";
import type { ReadingStatus } from "../types";

export interface FilterState {
  sources: string[];
  readingStatus: ReadingStatus[];
}

interface FilterDropdownProps {
  state: FilterState;
  availableSources: string[];
  onChange: (state: FilterState) => void;
}

const STATUS_OPTIONS: { value: ReadingStatus; label: string }[] = [
  { value: "unread", label: "Unread" },
  { value: "started", label: "Started" },
  { value: "completed", label: "Completed" },
];

export function filterCount(state: FilterState): number {
  return state.sources.length + state.readingStatus.length;
}

export function FilterDropdown(props: FilterDropdownProps) {
  function toggleSource(source: string) {
    const current = props.state.sources;
    const next = current.includes(source)
      ? current.filter((s) => s !== source)
      : [...current, source];
    props.onChange({ ...props.state, sources: next });
  }

  function toggleStatus(status: ReadingStatus) {
    const current = props.state.readingStatus;
    const next = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    props.onChange({ ...props.state, readingStatus: next });
  }

  function clearAll() {
    props.onChange({ sources: [], readingStatus: [] });
  }

  const activeCount = () => filterCount(props.state);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        class="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        title="Filters"
      >
        <SlidersHorizontal size={16} />
        <Show when={activeCount() > 0}>
          <span class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {activeCount()}
          </span>
        </Show>
      </DropdownMenuTrigger>

      <DropdownMenuContent class="w-56">
        <div class="flex items-center justify-between px-2 pb-1 pt-2">
          <span class="text-sm font-semibold text-foreground">Filters</span>
          <Show when={activeCount() > 0}>
            <button
              class="cursor-pointer text-xs text-primary hover:text-primary-hover"
              onClick={clearAll}
            >
              Clear all
            </button>
          </Show>
        </div>
        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuGroupLabel>Reading status</DropdownMenuGroupLabel>
          <For each={STATUS_OPTIONS}>
            {(opt) => (
              <DropdownMenuCheckboxItem
                checked={props.state.readingStatus.includes(opt.value)}
                onChange={() => toggleStatus(opt.value)}
                closeOnSelect={false}
              >
                {opt.label}
              </DropdownMenuCheckboxItem>
            )}
          </For>
        </DropdownMenuGroup>

        <Show when={props.availableSources.length > 1}>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuGroupLabel>Source</DropdownMenuGroupLabel>
            <div class="max-h-40 overflow-y-auto">
              <For each={props.availableSources}>
                {(source) => (
                  <DropdownMenuCheckboxItem
                    checked={props.state.sources.includes(source)}
                    onChange={() => toggleSource(source)}
                    closeOnSelect={false}
                  >
                    {source}
                  </DropdownMenuCheckboxItem>
                )}
              </For>
            </div>
          </DropdownMenuGroup>
        </Show>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
