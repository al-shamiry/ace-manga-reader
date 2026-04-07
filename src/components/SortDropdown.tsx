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
      props.onChange({
        field,
        direction: props.preference.direction === "asc" ? "desc" : "asc",
      });
    } else {
      props.onChange({ field, direction: props.preference.direction });
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        class="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        title="Sort"
      >
        <ArrowUpDown size={16} />
        <Show when={isNonDefault(props.preference)}>
          <span class="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary" />
        </Show>
      </DropdownMenuTrigger>

      <DropdownMenuContent class="w-48">
        <DropdownMenuGroup>
          <div class="px-2 pb-1 pt-2 text-sm font-semibold text-foreground">
            Sort By
          </div>
          <DropdownMenuSeparator />
          <For each={SORT_OPTIONS}>
            {(option) => {
              const isActive = () => props.preference.field === option.value;
              return (
                <DropdownMenuItem
                  class="flex justify-between"
                  classList={{ "text-primary! focus:text-primary!": isActive() }}
                  closeOnSelect={false}
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
