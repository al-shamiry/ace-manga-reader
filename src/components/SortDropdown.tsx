import { Show, For } from "solid-js";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-solid";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import { toolbarIconButtonClass } from "./ui/toolbar";
import type { SortField, SortPreference } from "../types";

interface SortDropdownProps {
  preference: SortPreference;
  onChange: (pref: SortPreference) => void;
  excludeFields?: SortField[];
  defaultPref?: SortPreference;
}

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: "last_read", label: "Last read" },
  { value: "alphabetical", label: "Alphabetical" },
  { value: "date_added", label: "Date added" },
  { value: "total_chapters", label: "Total chapters" },
];

const DEFAULT_PREF: SortPreference = { field: "last_read", direction: "desc" };

export function SortDropdown(props: SortDropdownProps) {
  const effectiveDefault = () => props.defaultPref ?? DEFAULT_PREF;
  const isNonDefault = () => {
    const d = effectiveDefault();
    return props.preference.field !== d.field || props.preference.direction !== d.direction;
  };
  const visibleOptions = () =>
    props.excludeFields?.length
      ? SORT_OPTIONS.filter((o) => !props.excludeFields!.includes(o.value))
      : SORT_OPTIONS;
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
      <DropdownMenuTrigger class={toolbarIconButtonClass} title="Sort">
        <ArrowUpDown size={16} />
        <Show when={isNonDefault()}>
          <span class="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-jade-500" />
        </Show>
      </DropdownMenuTrigger>

      <DropdownMenuContent class="w-48">
        <DropdownMenuGroup>
          <div class="px-2 pb-1 pt-2 text-sm font-semibold text-foreground">
            Sort By
          </div>
          <DropdownMenuSeparator />
          <For each={visibleOptions()}>
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
