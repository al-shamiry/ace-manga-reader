import { createMemo, createSignal, For, Show } from "solid-js";

import { Check, Search, X } from "lucide-solid";

import { cn } from "~/lib/utils";

interface ChipMultiSelectProps {
  /** Full set of selectable values. */
  options: string[];
  /** Currently selected values. */
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  /** Shown when the query matches nothing. */
  emptyLabel?: string;
  class?: string;
}

/**
 * Inline searchable multi-select with chips for selected values.
 *
 * Deliberately self-contained rather than built on Kobalte's Combobox: this
 * lives *inside* a DropdownMenu, and Kobalte's Combobox portals its listbox to
 * the body — which the parent menu treats as an outside interaction (closing
 * it) while also intercepting typing for its own typeahead. Keeping the input,
 * chips, and option list in one DOM subtree sidesteps both conflicts: clicks
 * register as "inside" the menu, and `stopPropagation` keeps keystrokes out of
 * the menu's roving-focus handler. Focus never leaves the input.
 */
const ChipMultiSelect = (props: ChipMultiSelectProps) => {
  const [query, setQuery] = createSignal("");
  const [highlight, setHighlight] = createSignal(0);

  const filtered = createMemo(() => {
    const q = query().trim().toLowerCase();
    if (!q) return props.options;
    return props.options.filter((o) => o.toLowerCase().includes(q));
  });

  const isSelected = (value: string) => props.selected.includes(value);

  function toggle(value: string) {
    props.onChange(
      isSelected(value)
        ? props.selected.filter((s) => s !== value)
        : [...props.selected, value],
    );
  }

  function clampHighlight(next: number) {
    const len = filtered().length;
    if (len === 0) return setHighlight(0);
    setHighlight(((next % len) + len) % len);
  }

  function onKeyDown(e: KeyboardEvent) {
    // Let the parent menu own these (dismiss / focus the trigger).
    if (e.key === "Escape" || e.key === "Tab") return;
    // Everything else stays here so the menu's typeahead/arrow nav can't grab it.
    e.stopPropagation();

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        clampHighlight(highlight() + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        clampHighlight(highlight() - 1);
        break;
      case "Enter": {
        e.preventDefault();
        const opt = filtered()[highlight()];
        if (opt) toggle(opt);
        break;
      }
    }
  }

  return (
    <div class={cn("flex flex-col gap-2", props.class)}>
      <Show when={props.selected.length > 0}>
        <div class="flex flex-wrap gap-1.5">
          <For each={props.selected}>
            {(value) => (
              <span class="inline-flex max-w-full items-center gap-1 rounded-md bg-jade-500/15 py-0.5 pr-1 pl-2 text-xs font-medium text-jade-300 ring-1 ring-jade-500/30 ring-inset">
                <span class="truncate">{value}</span>
                <button
                  type="button"
                  aria-label={`Remove ${value}`}
                  // Keep focus in the input; click toggles off.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => toggle(value)}
                  class="grid size-4 shrink-0 place-items-center rounded-sm text-jade-300/60 transition-colors hover:bg-jade-500/20 hover:text-jade-300"
                >
                  <X size={11} stroke-width={2.5} />
                </button>
              </span>
            )}
          </For>
        </div>
      </Show>

      <div class="relative">
        <Search
          size={14}
          class="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-ink-500"
        />
        <input
          type="text"
          value={query()}
          spellcheck={false}
          autocomplete="off"
          placeholder={props.placeholder ?? "Search…"}
          onInput={(e) => {
            setQuery(e.currentTarget.value);
            setHighlight(0);
          }}
          onKeyDown={onKeyDown}
          class="h-8 w-full rounded-md border border-ink-600 bg-ink-900 pr-2 pl-7 text-sm text-ink-100 transition-colors outline-none placeholder:text-ink-500 focus:border-jade-500/60"
        />
      </div>

      <Show when={query().trim() !== ""}>
        <div class="-mr-1 max-h-40 overflow-y-auto pr-1">
          <Show
            when={filtered().length > 0}
            fallback={
              <p class="px-2 py-3 text-center text-xs text-ink-500">
                {props.emptyLabel ?? "No matches"}
              </p>
            }
          >
            <For each={filtered()}>
              {(value, i) => {
                const active = () => isSelected(value);
                const highlighted = () => highlight() === i();
                return (
                  <button
                    type="button"
                    // Preserve input focus so typing keeps working after a click.
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setHighlight(i())}
                    onClick={() => toggle(value)}
                    class={cn(
                      "group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-ink-200 transition-colors",
                      highlighted() && "bg-ink-700/70 text-ink-50",
                    )}
                  >
                    <span
                      class={cn(
                        "grid size-4 shrink-0 place-items-center rounded-[3px] border transition-colors",
                        active()
                          ? "border-jade-500 bg-jade-500"
                          : "border-ink-600 bg-ink-900",
                      )}
                    >
                      <Show when={active()}>
                        <Check
                          size={12}
                          stroke-width={3}
                          class="text-ink-950"
                        />
                      </Show>
                    </span>
                    <span class="truncate">{value}</span>
                  </button>
                );
              }}
            </For>
          </Show>
        </div>
      </Show>
    </div>
  );
};

export { ChipMultiSelect };
