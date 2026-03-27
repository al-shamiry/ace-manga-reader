import { Show, For, createSignal } from "solid-js";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-solid";
import type { SortField, SortPreference } from "../types";

interface SortDropdownProps {
  preference: SortPreference;
  onChange: (pref: SortPreference) => void;
}

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: "last_read", label: "Last read" },
  { value: "alphabetical", label: "Alphabetical" },
  { value: "date_added", label: "Date added" },
  { value: "total_chapters", label: "Total chapters" },
];

const DEFAULT_PREF: SortPreference = { field: "last_read", direction: "desc" };

function isNonDefault(pref: SortPreference): boolean {
  return pref.field !== DEFAULT_PREF.field || pref.direction !== DEFAULT_PREF.direction;
}

export function SortDropdown(props: SortDropdownProps) {
  const [open, setOpen] = createSignal(false);

  function selectField(field: SortField) {
    if (props.preference.field === field) {
      // Same field — toggle direction
      props.onChange({
        field,
        direction: props.preference.direction === "asc" ? "desc" : "asc",
      });
    } else {
      // Different field — keep current direction
      props.onChange({ field, direction: props.preference.direction });
    }
  }

  return (
    <div class="relative">
      <button
        class="flex items-center justify-center w-8 h-8 rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors cursor-pointer relative"
        onClick={() => setOpen(!open())}
        title="Sort"
      >
        <ArrowUpDown size={16} />
        <Show when={isNonDefault(props.preference)}>
          <span class="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-indigo-500" />
        </Show>
      </button>

      <Show when={open()}>
        <div class="fixed inset-0 z-40" onClick={() => setOpen(false)} />
        <div class="absolute right-0 top-10 z-50 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1">
          <div class="px-3 py-1.5 border-b border-zinc-700">
            <span class="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Sort by</span>
          </div>
          <For each={SORT_OPTIONS}>
            {(option) => {
              const isActive = () => props.preference.field === option.value;
              return (
                <button
                  class={`flex items-center justify-between w-full px-3 py-1.5 text-sm transition-colors cursor-pointer ${
                    isActive() ? "text-indigo-400 bg-zinc-750" : "text-zinc-300 hover:bg-zinc-700"
                  }`}
                  onClick={() => selectField(option.value)}
                >
                  <span>{option.label}</span>
                  <Show when={isActive()}>
                    {props.preference.direction === "asc"
                      ? <ArrowUp size={14} />
                      : <ArrowDown size={14} />}
                  </Show>
                </button>
              );
            }}
          </For>
        </div>
      </Show>
    </div>
  );
}
