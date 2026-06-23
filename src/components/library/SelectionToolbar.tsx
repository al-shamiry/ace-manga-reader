import { Show } from "solid-js";

import {
  CheckCheck,
  Circle,
  Square,
  SquareCheck,
  SquaresIntersect,
  Tag,
  Trash2,
} from "lucide-solid";

import type { Category } from "~/types";

import { CategoryMenu } from "~/components/library/CategoryMenu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  ToolbarActions,
  ToolbarButton,
  ToolbarInlineButton,
  ToolbarTitle,
} from "~/components/ui/toolbar";

interface Props {
  count: number;
  visibleCount: number;
  categories: Category[];
  onSelectAll: () => void;
  onSelectNone: () => void;
  onInvert: () => void;
  /** Category memberships of the selected mangas — one entry per manga. */
  selectedCategoryIds: string[][];
  onAssignCategories: (addIds: string[], removeIds: string[]) => void;
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

        <CategoryMenu
          mode="assign"
          categories={props.categories}
          selectedCategoryIds={props.selectedCategoryIds}
          onAssign={props.onAssignCategories}
          trigger={
            <DropdownMenuTrigger
              as={ToolbarInlineButton}
              disabled={!hasSelection()}
              title="Adjust categories for selection"
            >
              <Tag size={14} /> Category
            </DropdownMenuTrigger>
          }
        />
        <ToolbarInlineButton
          onClick={props.onMarkRead}
          disabled={!hasSelection()}
        >
          <CheckCheck size={14} /> Mark read
        </ToolbarInlineButton>
        <ToolbarInlineButton
          onClick={props.onMarkUnread}
          disabled={!hasSelection()}
        >
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
        <ToolbarInlineButton onClick={props.onCancel}>
          Cancel
        </ToolbarInlineButton>
      </ToolbarActions>
    </>
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
