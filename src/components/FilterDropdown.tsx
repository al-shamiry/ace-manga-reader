import { For, Show } from "solid-js";

import { SlidersHorizontal } from "lucide-solid";

import type { ReadingStatus } from "~/types";

import { ChipMultiSelect } from "./ui/chip-multiselect";
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
import { toolbarIconButtonClass } from "./ui/toolbar";

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
  function setSources(next: string[]) {
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
      <DropdownMenuTrigger class={toolbarIconButtonClass} title="Filters">
        <SlidersHorizontal size={16} />
        <Show when={activeCount() > 0}>
          <span class="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-jade-500 px-1 text-[10px] font-bold text-ink-950">
            {activeCount()}
          </span>
        </Show>
      </DropdownMenuTrigger>

      <DropdownMenuContent class="w-56">
        <DropdownMenuHeader onReset={clearAll} canReset={activeCount() > 0}>
          Filters
        </DropdownMenuHeader>
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
            <div class="px-1 pt-0.5 pb-1">
              <ChipMultiSelect
                options={props.availableSources}
                selected={props.state.sources}
                onChange={setSources}
                placeholder="Search sources…"
                emptyLabel="No sources match"
              />
            </div>
          </DropdownMenuGroup>
        </Show>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
