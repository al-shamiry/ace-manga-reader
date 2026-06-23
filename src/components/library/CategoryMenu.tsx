import { createSignal, For, type JSX, Show } from "solid-js";

import { Settings2, Trash2 } from "lucide-solid";

import type { Category } from "~/types";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "~/components/ui/dropdown-menu";
import { toolbarInlineButtonClass } from "~/components/ui/toolbar";

import { CategoryEditorDialog } from "./CategoryEditorDialog";

type TriState = "checked" | "unchecked" | "indeterminate";

type CategoryMenuBase = {
  categories: Category[];
  /** The trigger element — pass a <DropdownMenuTrigger as={…}>…</DropdownMenuTrigger>. */
  trigger: JSX.Element;
  onOpenChange?: (open: boolean) => void;
};

type ToggleProps = CategoryMenuBase & {
  /** Membership toggles commit immediately, reflecting `selectedIds`. */
  mode: "toggle";
  selectedIds: string[];
  onToggle: (categoryId: string) => void;
  isInLibrary: boolean;
  onRemoveFromLibrary: () => void;
};

type AssignProps = CategoryMenuBase & {
  /**
   * Multi-select adjust mode. Each category shows a tri-state derived from the
   * selection (`selectedCategoryIds` is one entry per selected manga). Checking
   * adds the whole selection to a category, unchecking removes it; a category
   * left indeterminate is untouched. Applying commits the add/remove diff.
   */
  mode: "assign";
  selectedCategoryIds: string[][];
  onAssign: (addIds: string[], removeIds: string[]) => void;
};

type Props = ToggleProps | AssignProps;

/**
 * Shared category picker dropdown for both the per-manga detail header
 * (`toggle`) and the bulk selection toolbar (`assign`). The "Manage
 * categories" affordance opens the full editor modal for create/rename/delete.
 */
export function CategoryMenu(props: Props) {
  const [open, setOpen] = createSignal(false);
  const [desired, setDesired] = createSignal<Map<string, TriState>>(new Map());
  const [editorOpen, setEditorOpen] = createSignal(false);
  // Snapshot of the tri-states when the menu opened, to diff against on apply.
  let initial = new Map<string, TriState>();

  function initialStates(): Map<string, TriState> {
    const states = new Map<string, TriState>();
    if (props.mode !== "assign") return states;
    const total = props.selectedCategoryIds.length;
    for (const cat of props.categories) {
      const count = props.selectedCategoryIds.filter((ids) =>
        ids.includes(cat.id),
      ).length;
      states.set(
        cat.id,
        count === 0
          ? "unchecked"
          : count === total
            ? "checked"
            : "indeterminate",
      );
    }
    return states;
  }

  function handleOpenChange(next: boolean) {
    if (next && props.mode === "assign") {
      initial = initialStates();
      setDesired(new Map(initial));
    }
    props.onOpenChange?.(next);
    setOpen(next);
  }

  // Cycle on click: indeterminate/unchecked → checked, checked → unchecked.
  function cycle(id: string) {
    setDesired((prev) => {
      const next = new Map(prev);
      next.set(id, prev.get(id) === "checked" ? "unchecked" : "checked");
      return next;
    });
  }

  function diff() {
    const add: string[] = [];
    const remove: string[] = [];
    for (const cat of props.categories) {
      const d = desired().get(cat.id) ?? "unchecked";
      if (d === (initial.get(cat.id) ?? "unchecked")) continue;
      if (d === "checked") add.push(cat.id);
      else if (d === "unchecked") remove.push(cat.id);
    }
    return { add, remove };
  }

  const hasChanges = () => {
    const { add, remove } = diff();
    return add.length + remove.length > 0;
  };

  function applyAssign() {
    if (props.mode !== "assign") return;
    const { add, remove } = diff();
    if (add.length === 0 && remove.length === 0) return;
    props.onAssign(add, remove);
    setOpen(false);
  }

  function openEditor() {
    setOpen(false);
    setEditorOpen(true);
  }

  function rowChecked(id: string) {
    return props.mode === "toggle"
      ? props.selectedIds.includes(id)
      : desired().get(id) === "checked";
  }

  function rowIndeterminate(id: string) {
    return props.mode === "assign" && desired().get(id) === "indeterminate";
  }

  function rowToggle(id: string) {
    if (props.mode === "toggle") props.onToggle(id);
    else cycle(id);
  }

  const anyCategorized = () =>
    props.mode === "assign" &&
    props.selectedCategoryIds.some((ids) => ids.length > 0);

  const headerLabel = () => {
    if (props.mode === "toggle")
      return props.isInLibrary ? "Categories" : "Add to category";
    return anyCategorized() ? "Adjust categories" : "Add to categories";
  };

  return (
    <>
      <DropdownMenu open={open()} onOpenChange={handleOpenChange}>
        {props.trigger}
        <DropdownMenuContent class="w-60">
          <div class="flex items-center justify-between gap-2 px-2 pt-1.5 pb-1">
            <span class="text-2xs font-semibold tracking-[0.14em] text-ink-500 uppercase">
              {headerLabel()}
            </span>
            <button
              type="button"
              class="flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 text-2xs font-medium tracking-wider text-ink-500 uppercase transition-colors hover:text-jade-400"
              onClick={openEditor}
              title="Manage categories"
            >
              <Settings2 size={12} /> Edit
            </button>
          </div>
          <DropdownMenuSeparator />
          <Show
            when={props.categories.length > 0}
            fallback={
              <p class="px-2 py-2 text-xs text-ink-500">
                No categories yet. Use Edit to create one.
              </p>
            }
          >
            <div class="max-h-60 overflow-y-auto">
              <For each={props.categories}>
                {(cat) => (
                  <DropdownMenuCheckboxItem
                    checked={rowChecked(cat.id)}
                    indeterminate={rowIndeterminate(cat.id)}
                    onChange={() => rowToggle(cat.id)}
                    closeOnSelect={false}
                  >
                    {cat.name}
                  </DropdownMenuCheckboxItem>
                )}
              </For>
            </div>
            <Show when={props.mode === "assign"}>
              <DropdownMenuSeparator />
              <div class="px-1 pt-0.5 pb-1">
                <button
                  type="button"
                  class={`${toolbarInlineButtonClass} w-full justify-center disabled:cursor-default disabled:opacity-40`}
                  disabled={!hasChanges()}
                  onClick={applyAssign}
                >
                  Apply
                </button>
              </div>
            </Show>
            <Show when={props.mode === "toggle" && props.isInLibrary}>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                class="gap-2 text-red-400 focus:bg-red-950/40 focus:text-red-300"
                onSelect={() =>
                  props.mode === "toggle" && props.onRemoveFromLibrary()
                }
              >
                <Trash2 size={14} />
                Remove from library
              </DropdownMenuItem>
            </Show>
          </Show>
        </DropdownMenuContent>
      </DropdownMenu>
      <CategoryEditorDialog open={editorOpen()} onOpenChange={setEditorOpen} />
    </>
  );
}
