import { For, Show } from "solid-js";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-solid";

import type { SortField, SortPreference } from "~/types";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuHeader,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { toolbarIconButtonClass } from "./ui/toolbar";

interface SortDropdownProps {
  preference: SortPreference;
  onChange: (pref: SortPreference) => void;
  excludeFields?: SortField[];
  defaultPref?: SortPreference;
}

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: "last-read", label: "Last read" },
  { value: "alphabetical", label: "Alphabetical" },
  { value: "date-added", label: "Date added" },
  { value: "total-chapters", label: "Total chapters" },
];

const DEFAULT_PREF: SortPreference = { field: "last-read", direction: "desc" };

export function SortDropdown(props: SortDropdownProps) {
  const effectiveDefault = () => props.defaultPref ?? DEFAULT_PREF;
  const isNonDefault = () => {
    const d = effectiveDefault();
    return (
      props.preference.field !== d.field ||
      props.preference.direction !== d.direction
    );
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

  function resetSort() {
    props.onChange(effectiveDefault());
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger class={toolbarIconButtonClass} title="Sort">
        <ArrowUpDown size={16} />
      </DropdownMenuTrigger>

      <DropdownMenuContent class="w-48">
        <DropdownMenuHeader onReset={resetSort} canReset={isNonDefault()}>
          Sort by
        </DropdownMenuHeader>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <For each={visibleOptions()}>
            {(option) => {
              const isActive = () => props.preference.field === option.value;
              return (
                <DropdownMenuItem
                  class="flex justify-between"
                  classList={{
                    "text-primary! focus:text-primary!": isActive(),
                  }}
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
