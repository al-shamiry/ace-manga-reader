import { Show, For } from "solid-js";
import { SlidersHorizontal } from "lucide-solid";
import { Checkbox } from "./ui/checkbox";
import { Popover, PopoverTrigger, PopoverContent } from "./ui/popover";
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
    <Popover>
      <PopoverTrigger
        class="flex items-center justify-center w-8 h-8 rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors cursor-pointer relative"
        title="Filters"
      >
        <SlidersHorizontal size={16} />
        <Show when={activeCount() > 0}>
          <span class="absolute -top-0.5 -right-0.5 min-w-4 h-4 flex items-center justify-center rounded-full bg-indigo-500 text-white text-[10px] font-bold px-1">
            {activeCount()}
          </span>
        </Show>
      </PopoverTrigger>

      <PopoverContent class="w-56 py-2">
        {/* Header */}
        <div class="flex items-center justify-between px-3 pb-2 border-b border-border">
          <span class="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
            Filters
          </span>
          <Show when={activeCount() > 0}>
            <button
              class="text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer"
              onClick={clearAll}
            >
              Clear all
            </button>
          </Show>
        </div>

        {/* Reading Status */}
        <div class="px-3 pt-2">
          <p class="text-xs font-medium text-zinc-500 mb-1.5">Reading Status</p>
          <For each={STATUS_OPTIONS}>
            {(opt) => (
              <Checkbox
                checked={props.state.readingStatus.includes(opt.value)}
                onChange={() => toggleStatus(opt.value)}
                label={opt.label}
              />
            )}
          </For>
        </div>

        {/* Sources */}
        <Show when={props.availableSources.length > 1}>
          <div class="px-3 pt-2 mt-1 border-t border-border">
            <p class="text-xs font-medium text-zinc-500 mb-1.5">Source</p>
            <div class="max-h-40 overflow-y-auto">
              <For each={props.availableSources}>
                {(source) => (
                  <Checkbox
                    checked={props.state.sources.includes(source)}
                    onChange={() => toggleSource(source)}
                    label={source}
                  />
                )}
              </For>
            </div>
          </div>
        </Show>
      </PopoverContent>
    </Popover>
  );
}
