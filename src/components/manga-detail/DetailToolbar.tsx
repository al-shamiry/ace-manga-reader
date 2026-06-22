import { For, Show } from "solid-js";

import {
  ArrowDownNarrowWide,
  ArrowLeft,
  ArrowUpNarrowWide,
  CheckCheck,
  Circle,
  RefreshCw,
  SlidersHorizontal,
  Square,
  SquareCheck,
  SquaresIntersect,
} from "lucide-solid";

import {
  CHAPTER_FILTERS,
  type ChapterFilterStatus,
} from "~/lib/chapter-status";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuGroupLabel,
  DropdownMenuHeader,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Toolbar,
  ToolbarActions,
  ToolbarButton,
  toolbarIconButtonClass,
  ToolbarInlineButton,
  ToolbarSpacer,
  ToolbarTitle,
} from "~/components/ui/toolbar";

type DetailToolbarProps = {
  selectMode: boolean;
  // Normal mode
  onBack: () => void;
  chaptersEmpty: boolean;
  onEnterSelect: () => void;
  sortDir: "asc" | "desc";
  onToggleSort: () => void;
  statusFilter: ChapterFilterStatus[];
  onStatusFilterChange: (next: ChapterFilterStatus[]) => void;
  refreshing: boolean;
  onRefresh: () => void;
  // Select mode
  selectedCount: number;
  visibleEmpty: boolean;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onInvert: () => void;
  onMarkRead: () => void;
  onMarkUnread: () => void;
  onExitSelect: () => void;
};

/** Anchored chapter status filter — mirrors the library FilterDropdown shape
 * (badge count + reset) but scoped to a single manga's chapter statuses. */
function ChapterFilterMenu(props: {
  state: ChapterFilterStatus[];
  onChange: (next: ChapterFilterStatus[]) => void;
}) {
  const count = () => props.state.length;
  function toggle(v: ChapterFilterStatus) {
    const cur = props.state;
    props.onChange(cur.includes(v) ? cur.filter((s) => s !== v) : [...cur, v]);
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        class={toolbarIconButtonClass}
        title="Filter chapters"
      >
        <SlidersHorizontal size={16} />
        <Show when={count() > 0}>
          <span class="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-jade-500 px-1 text-[10px] font-bold text-ink-950">
            {count()}
          </span>
        </Show>
      </DropdownMenuTrigger>
      <DropdownMenuContent class="w-48">
        <DropdownMenuHeader
          onReset={() => props.onChange([])}
          canReset={count() > 0}
        >
          Filter
        </DropdownMenuHeader>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuGroupLabel>Reading status</DropdownMenuGroupLabel>
          <For each={CHAPTER_FILTERS}>
            {(opt) => (
              <DropdownMenuCheckboxItem
                checked={props.state.includes(opt.value)}
                onChange={() => toggle(opt.value)}
                closeOnSelect={false}
              >
                {opt.label}
              </DropdownMenuCheckboxItem>
            )}
          </For>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DetailToolbar(props: DetailToolbarProps) {
  return (
    <Toolbar>
      <Show
        when={props.selectMode}
        fallback={
          <>
            <ToolbarInlineButton onClick={() => props.onBack()}>
              <ArrowLeft size={14} />
              Back
            </ToolbarInlineButton>
            <ToolbarSpacer />
            <ToolbarActions>
              <ToolbarInlineButton
                onClick={() => props.onEnterSelect()}
                disabled={props.chaptersEmpty}
              >
                Select
              </ToolbarInlineButton>
              <ToolbarButton
                onClick={() => props.onToggleSort()}
                title={
                  props.sortDir === "asc" ? "Oldest first" : "Newest first"
                }
              >
                <Show
                  when={props.sortDir === "asc"}
                  fallback={<ArrowUpNarrowWide size={16} />}
                >
                  <ArrowDownNarrowWide size={16} />
                </Show>
              </ToolbarButton>
              <ChapterFilterMenu
                state={props.statusFilter}
                onChange={props.onStatusFilterChange}
              />
              <ToolbarButton
                onClick={() => props.onRefresh()}
                disabled={props.refreshing}
                title="Re-scan this manga from disk"
              >
                <RefreshCw
                  size={16}
                  class={props.refreshing ? "animate-spin" : ""}
                />
              </ToolbarButton>
            </ToolbarActions>
          </>
        }
      >
        <ToolbarTitle class="flex-1">
          {props.selectedCount} selected
        </ToolbarTitle>
        <ToolbarActions>
          <ToolbarButton
            onClick={() => props.onSelectAll()}
            title="Select all"
            disabled={props.visibleEmpty}
          >
            <SquareCheck size={16} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => props.onSelectNone()}
            title="Select none"
            disabled={props.selectedCount === 0}
          >
            <Square size={16} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => props.onInvert()}
            title="Invert selection"
            disabled={props.visibleEmpty}
          >
            <SquaresIntersect size={16} />
          </ToolbarButton>
          <div class="mx-1 h-5 w-px shrink-0 bg-ink-800" />
          <ToolbarInlineButton
            onClick={() => props.onMarkRead()}
            disabled={props.selectedCount === 0}
          >
            <CheckCheck size={14} /> Mark read
          </ToolbarInlineButton>
          <ToolbarInlineButton
            onClick={() => props.onMarkUnread()}
            disabled={props.selectedCount === 0}
          >
            <Circle size={14} /> Mark unread
          </ToolbarInlineButton>
          <ToolbarInlineButton onClick={() => props.onExitSelect()}>
            Cancel
          </ToolbarInlineButton>
        </ToolbarActions>
      </Show>
    </Toolbar>
  );
}
