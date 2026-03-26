import { Show, For, createSignal } from "solid-js";
import { SlidersHorizontal } from "lucide-solid";
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
  const [open, setOpen] = createSignal(false);

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
    <div class="relative">
      <button
        class="flex items-center justify-center w-8 h-8 rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors cursor-pointer relative"
        onClick={() => setOpen(!open())}
        title="Filters"
      >
        <SlidersHorizontal size={16} />
        <Show when={activeCount() > 0}>
          <span class="absolute -top-0.5 -right-0.5 min-w-4 h-4 flex items-center justify-center rounded-full bg-indigo-500 text-white text-[10px] font-bold px-1">
            {activeCount()}
          </span>
        </Show>
      </button>

      <Show when={open()}>
        <div class="fixed inset-0 z-40" onClick={() => setOpen(false)} />
        <div class="absolute right-0 top-10 z-50 w-56 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-2">
          {/* Header */}
          <div class="flex items-center justify-between px-3 pb-2 border-b border-zinc-700">
            <span class="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Filters</span>
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
                <label class="flex items-center gap-2 py-1 cursor-pointer text-sm text-zinc-300 hover:text-zinc-100">
                  <input
                    type="checkbox"
                    class="accent-indigo-500"
                    checked={props.state.readingStatus.includes(opt.value)}
                    onChange={() => toggleStatus(opt.value)}
                  />
                  {opt.label}
                </label>
              )}
            </For>
          </div>

          {/* Sources */}
          <Show when={props.availableSources.length > 1}>
            <div class="px-3 pt-2 mt-1 border-t border-zinc-700">
              <p class="text-xs font-medium text-zinc-500 mb-1.5">Source</p>
              <div class="max-h-40 overflow-y-auto">
                <For each={props.availableSources}>
                  {(source) => (
                    <label class="flex items-center gap-2 py-1 cursor-pointer text-sm text-zinc-300 hover:text-zinc-100">
                      <input
                        type="checkbox"
                        class="accent-indigo-500"
                        checked={props.state.sources.includes(source)}
                        onChange={() => toggleSource(source)}
                      />
                      <span class="truncate">{source}</span>
                    </label>
                  )}
                </For>
              </div>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
}
