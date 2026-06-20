import { For, Show, createSignal } from "solid-js";
import { CheckCheck, Circle, Square, SquareCheck, SquaresIntersect, Tag, Trash2 } from "lucide-solid";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { ToolbarActions, ToolbarButton, ToolbarInlineButton, ToolbarTitle, toolbarInlineButtonClass } from "./ui/toolbar";
import type { Category } from "../types";

interface Props {
  count: number;
  visibleCount: number;
  categories: Category[];
  onSelectAll: () => void;
  onSelectNone: () => void;
  onInvert: () => void;
  onApplyCategories: (categoryIds: string[]) => void;
  onMarkRead: () => void;
  onMarkUnread: () => void;
  /** Library-only — omit to hide the Remove action entirely. */
  onRemoveFromLibrary?: () => void;
  /** Library-only — pairs with `currentCategoryName` to offer a per-category remove. */
  onRemoveFromCategory?: () => void;
  currentCategoryName?: string;
  onCancel: () => void;
}

/**
 * The toolbar that replaces a view's normal chrome while in manga
 * selection mode. Render inside a <Toolbar>. Bulk actions are disabled
 * until at least one manga is selected.
 */
export function SelectionToolbar(props: Props) {
  const hasSelection = () => props.count > 0;

  return (
    <>
      <ToolbarTitle class="flex-1">{props.count} selected</ToolbarTitle>
      <ToolbarActions>
        <ToolbarButton
          onClick={props.onSelectAll}
          title="Select all"
          disabled={props.visibleCount === 0}
        >
          <SquareCheck size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={props.onSelectNone}
          title="Select none"
          disabled={!hasSelection()}
        >
          <Square size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={props.onInvert}
          title="Invert selection"
          disabled={props.visibleCount === 0}
        >
          <SquaresIntersect size={16} />
        </ToolbarButton>

        <div class="mx-1 h-5 w-px shrink-0 bg-ink-800" />

        <BulkCategoryMenu
          categories={props.categories}
          disabled={!hasSelection()}
          onApply={props.onApplyCategories}
        />
        <ToolbarInlineButton onClick={props.onMarkRead} disabled={!hasSelection()}>
          <CheckCheck size={14} /> Mark read
        </ToolbarInlineButton>
        <ToolbarInlineButton onClick={props.onMarkUnread} disabled={!hasSelection()}>
          <Circle size={14} /> Mark unread
        </ToolbarInlineButton>
        <Show when={props.onRemoveFromLibrary}>
          <RemoveMenu
            disabled={!hasSelection()}
            currentCategoryName={props.currentCategoryName}
            onRemoveFromCategory={props.onRemoveFromCategory}
            onRemoveFromLibrary={() => props.onRemoveFromLibrary?.()}
          />
        </Show>
        <ToolbarInlineButton onClick={props.onCancel}>Cancel</ToolbarInlineButton>
      </ToolbarActions>
    </>
  );
}

/**
 * Anchored category picker for bulk assignment. Checkboxes start empty;
 * applying additively adds every selected manga to the checked categories
 * (and into the library). Non-destructive — it never removes memberships.
 */
function BulkCategoryMenu(props: {
  categories: Category[];
  disabled?: boolean;
  onApply: (categoryIds: string[]) => void;
}) {
  const [open, setOpen] = createSignal(false);
  const [checked, setChecked] = createSignal<Set<string>>(new Set<string>());

  function handleOpenChange(next: boolean) {
    if (next) setChecked(new Set<string>());
    setOpen(next);
  }

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function apply() {
    const ids = [...checked()];
    if (ids.length === 0) return;
    props.onApply(ids);
    setOpen(false);
  }

  return (
    <DropdownMenu open={open()} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        as={ToolbarInlineButton}
        disabled={props.disabled}
        title="Add selected to categories"
      >
        <Tag size={14} /> Category
      </DropdownMenuTrigger>
      <DropdownMenuContent class="w-56">
        <div class="px-2 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-ink-500">
          Add to categories
        </div>
        <DropdownMenuSeparator />
        <Show
          when={props.categories.length > 0}
          fallback={
            <p class="px-2 py-2 text-xs text-ink-500">No categories yet.</p>
          }
        >
          <div class="max-h-60 overflow-y-auto">
            <For each={props.categories}>
              {(cat) => (
                <DropdownMenuCheckboxItem
                  checked={checked().has(cat.id)}
                  onChange={() => toggle(cat.id)}
                  closeOnSelect={false}
                >
                  {cat.name}
                </DropdownMenuCheckboxItem>
              )}
            </For>
          </div>
          <DropdownMenuSeparator />
          <div class="px-1 pb-1 pt-0.5">
            <button
              type="button"
              class={`${toolbarInlineButtonClass} w-full justify-center disabled:cursor-default disabled:opacity-40`}
              disabled={checked().size === 0}
              onClick={apply}
            >
              Add to {checked().size || ""} {checked().size === 1 ? "category" : "categories"}
            </button>
          </div>
        </Show>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Destructive remove action. Offers "remove from current category" (when a
 * category is in context) and "remove from library" as distinct choices so a
 * bulk remove can't quietly drop a manga from the whole library.
 */
function RemoveMenu(props: {
  disabled?: boolean;
  currentCategoryName?: string;
  onRemoveFromCategory?: () => void;
  onRemoveFromLibrary: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        as={ToolbarInlineButton}
        disabled={props.disabled}
        title="Remove selected"
        class="text-red-400 hover:bg-red-950/30 hover:text-red-300"
      >
        <Trash2 size={14} /> Remove
      </DropdownMenuTrigger>
      <DropdownMenuContent class="w-56">
        <Show when={props.onRemoveFromCategory && props.currentCategoryName}>
          <DropdownMenuItem onSelect={() => props.onRemoveFromCategory?.()}>
            Remove from {props.currentCategoryName}
          </DropdownMenuItem>
        </Show>
        <DropdownMenuItem
          class="gap-2 text-red-400 focus:bg-red-950/40 focus:text-red-300"
          onSelect={() => props.onRemoveFromLibrary()}
        >
          <Trash2 size={14} />
          Remove from library
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
