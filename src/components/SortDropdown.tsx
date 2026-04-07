import { Show, For } from "solid-js";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-solid";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuGroupLabel,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
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
    <DropdownMenu>
      <DropdownMenuTrigger
        class="flex items-center justify-center w-8 h-8 rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors cursor-pointer relative"
        title="Sort"
      >
        <ArrowUpDown size={16} />
        <Show when={isNonDefault(props.preference)}>
          <span class="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-indigo-500" />
        </Show>
      </DropdownMenuTrigger>

      <DropdownMenuContent class="w-48 py-1">
        <DropdownMenuGroup>
          <DropdownMenuGroupLabel class="px-3 py-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-wide">
            Sort by
          </DropdownMenuGroupLabel>
          <DropdownMenuSeparator class="my-1 h-px bg-border" />
          <For each={SORT_OPTIONS}>
            {(option) => {
              const isActive = () => props.preference.field === option.value;
              return (
                <DropdownMenuItem
                  class="flex items-center justify-between px-3 py-1.5 text-sm cursor-pointer text-zinc-300 focus:bg-zinc-700 data-highlighted:bg-zinc-700 data-highlighted:text-zinc-100"
                  classList={{ "text-indigo-400! focus:text-indigo-400!": isActive() }}
                  onSelect={() => selectField(option.value)}
                >
                  <span>{option.label}</span>
                  <Show when={isActive()}>
                    {props.preference.direction === "asc" ? (
                      <ArrowUp size={14} />
                    ) : (
                      <ArrowDown size={14} />
                    )}
                  </Show>
                </DropdownMenuItem>
              );
            }}
          </For>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
