import { Show } from "solid-js";

import {
  Eye,
  EyeOff,
  Plus,
  RefreshCw,
  Square,
  SquareCheck,
  SquaresIntersect,
  Trash2,
} from "lucide-solid";

import {
  Toolbar,
  ToolbarActions,
  ToolbarButton,
  ToolbarInlineButton,
  ToolbarTitle,
} from "~/components/ui/toolbar";

interface SourcesToolbarProps {
  selectionMode: boolean;
  selectedCount: number;
  selectableCount: number;
  bulkRemoving: boolean;
  bulkHideLabel: "Hide" | "Show";
  isAnyScanning: boolean;
  showHidden: boolean;
  onAddSource: () => void;
  onEnterSelection: () => void;
  onRescanAll: () => void;
  onToggleHidden: () => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onInvert: () => void;
  onBulkRescan: () => void;
  onBulkHideShow: () => void;
  onBulkRemoveRequest: () => void;
  onExitSelection: () => void;
}

export function SourcesToolbar(props: SourcesToolbarProps) {
  return (
    <Toolbar>
      <Show
        when={props.selectionMode}
        fallback={
          <>
            <ToolbarTitle class="flex-1">Sources</ToolbarTitle>
            <ToolbarActions>
              <ToolbarInlineButton onClick={props.onAddSource}>
                <Plus size={14} /> Add source
              </ToolbarInlineButton>
              <ToolbarInlineButton onClick={props.onEnterSelection}>
                Select
              </ToolbarInlineButton>
              <ToolbarButton
                onClick={props.onRescanAll}
                title="Re-scan all sources"
                disabled={props.isAnyScanning}
              >
                <RefreshCw
                  size={16}
                  class={props.isAnyScanning ? "animate-spin" : ""}
                />
              </ToolbarButton>
              <ToolbarButton
                onClick={props.onToggleHidden}
                title={
                  props.showHidden
                    ? "Hide hidden sources"
                    : "Show hidden sources"
                }
                class={props.showHidden ? "text-jade-400" : ""}
              >
                <Show when={props.showHidden} fallback={<Eye size={16} />}>
                  <EyeOff size={16} />
                </Show>
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
            onClick={props.onSelectAll}
            title="Select all"
            disabled={props.selectableCount === 0}
          >
            <SquareCheck size={16} />
          </ToolbarButton>
          <ToolbarButton
            onClick={props.onSelectNone}
            title="Select none"
            disabled={props.selectedCount === 0}
          >
            <Square size={16} />
          </ToolbarButton>
          <ToolbarButton
            onClick={props.onInvert}
            title="Invert selection"
            disabled={props.selectableCount === 0}
          >
            <SquaresIntersect size={16} />
          </ToolbarButton>
          <div class="mx-1 h-5 w-px shrink-0 bg-ink-800" />
          <ToolbarInlineButton
            onClick={props.onBulkRescan}
            disabled={props.selectedCount === 0 || props.bulkRemoving}
          >
            <RefreshCw size={14} /> Re-scan
          </ToolbarInlineButton>
          <ToolbarInlineButton
            onClick={props.onBulkHideShow}
            disabled={props.selectedCount === 0 || props.bulkRemoving}
          >
            <Show
              when={props.bulkHideLabel === "Show"}
              fallback={
                <>
                  <EyeOff size={14} /> Hide
                </>
              }
            >
              <Eye size={14} /> Show
            </Show>
          </ToolbarInlineButton>
          <ToolbarInlineButton
            onClick={props.onBulkRemoveRequest}
            disabled={props.selectedCount === 0 || props.bulkRemoving}
            class="text-red-400 hover:bg-red-950/30 hover:text-red-300"
          >
            <Trash2 size={14} /> Remove
          </ToolbarInlineButton>
          <ToolbarInlineButton onClick={props.onExitSelection}>
            Cancel
          </ToolbarInlineButton>
        </ToolbarActions>
      </Show>
    </Toolbar>
  );
}
