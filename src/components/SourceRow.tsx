import { createEffect, on, Show } from "solid-js";

import {
  AlertCircle,
  Check,
  EllipsisVertical,
  Eye,
  EyeOff,
  Folder,
  GripVertical,
  Link2,
  Pencil,
  RefreshCw,
  Trash2,
} from "lucide-solid";

import type { Source } from "~/types";

import type { ScanEntry } from "../context/SourcesContext";
import { formatRelativeDay } from "../lib/date";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface RenameState {
  value: string;
  onChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

interface RemoveState {
  onConfirm: () => void;
  onCancel: () => void;
}

interface LocateState {
  onConfirm: () => void;
  onCancel: () => void;
  error?: string;
}

interface SourceRowProps {
  source: Source;
  hidden?: boolean;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  onClick: () => void;
  onLocate: () => void;
  onRescan: () => void;
  onRename: () => void;
  onHide: () => void;
  onRemove: () => void;
  scanStatus?: ScanEntry;
  renaming?: RenameState;
  removing?: RemoveState;
  locating?: LocateState;
  fadingOut?: boolean;
  onFadeOutDone?: () => void;
  dragging?: boolean;
  dropIndicator?: "above" | "below";
  onDragStart?: (e: DragEvent) => void;
  onDragOver?: (e: DragEvent) => void;
  onDragEnd?: () => void;
  onDrop?: (e: DragEvent) => void;
}

export function SourceRow(props: SourceRowProps) {
  let rowRef!: HTMLDivElement;
  let hideClicked = false;
  const hasScanned = () => props.source.scanned_at > 0;
  const absoluteTime = () =>
    hasScanned()
      ? new Date(props.source.scanned_at * 1000).toLocaleString()
      : undefined;
  const lastScanLabel = () =>
    hasScanned() ? formatRelativeDay(props.source.scanned_at) : "never";
  const isRemoving = () => !!props.removing;
  const isRenaming = () => !!props.renaming;
  const isLocating = () => !!props.locating;
  const isSelectionMode = () => !!props.selectionMode;

  function runMenuAction(action: () => void) {
    hideClicked = true;
    action();
    requestAnimationFrame(() => {
      hideClicked = false;
    });
  }

  createEffect(
    on(
      () => props.fadingOut,
      (fading) => {
        if (!fading || !rowRef) return;
        // Capture current height so the collapse transition has a start value
        const h = rowRef.offsetHeight;
        rowRef.style.maxHeight = `${h}px`;
        // Force reflow before adding the collapsed state
        void rowRef.offsetHeight;
        rowRef.classList.add("source-row-fade-out");
      },
    ),
  );

  function handleTransitionEnd(e: TransitionEvent) {
    if (
      e.propertyName === "opacity" &&
      props.fadingOut &&
      props.onFadeOutDone
    ) {
      props.onFadeOutDone();
    }
  }

  return (
    <div
      ref={rowRef}
      tabIndex={0}
      draggable={
        !isSelectionMode() &&
        !isRemoving() &&
        !isLocating() &&
        !isRenaming() &&
        !props.fadingOut &&
        !props.hidden
      }
      role={isSelectionMode() ? "checkbox" : undefined}
      aria-checked={isSelectionMode() ? !!props.selected : undefined}
      class={`group relative flex flex-col overflow-hidden rounded-md border-b border-ink-800/40 px-4 py-3 transition-colors focus-visible:ring-2 focus-visible:ring-jade-500/60 focus-visible:outline-none ${
        props.dragging ? "opacity-40" : ""
      } ${
        isRemoving()
          ? "border-red-900/40 bg-red-950/20"
          : isLocating()
            ? "border-red-900/30 bg-red-950/15"
            : props.fadingOut
              ? ""
              : props.selected && isSelectionMode()
                ? "cursor-pointer border-jade-900/40 bg-jade-950/20 hover:bg-jade-950/30"
                : "cursor-pointer hover:bg-ink-900/40"
      }`}
      onClick={() => {
        if (
          isRemoving() ||
          isLocating() ||
          isRenaming() ||
          hideClicked ||
          props.fadingOut
        )
          return;
        if (isSelectionMode()) {
          props.onToggleSelect?.();
          return;
        }
        props.onClick();
      }}
      onKeyDown={(e) => {
        if (isLocating() && e.key === "Escape") {
          e.preventDefault();
          props.locating!.onCancel();
          return;
        }

        if (isRemoving() && e.key === "Escape") {
          e.preventDefault();
          props.removing!.onCancel();
          return;
        }

        if (
          !isRemoving() &&
          !isLocating() &&
          !isRenaming() &&
          !isSelectionMode() &&
          !hideClicked &&
          !props.fadingOut &&
          e.key === "Delete"
        ) {
          e.preventDefault();
          props.onRemove();
          return;
        }

        if (
          !isRemoving() &&
          !isLocating() &&
          !isRenaming() &&
          !isSelectionMode() &&
          !hideClicked &&
          !props.fadingOut &&
          e.key === "F2"
        ) {
          e.preventDefault();
          props.onRename();
          return;
        }

        if (
          !isRemoving() &&
          !isLocating() &&
          !isRenaming() &&
          !hideClicked &&
          !props.fadingOut &&
          (e.key === "Enter" || e.key === " ")
        ) {
          e.preventDefault();
          if (isSelectionMode()) {
            props.onToggleSelect?.();
            return;
          }
          props.onClick();
        }
      }}
      onTransitionEnd={handleTransitionEnd}
      onDragStart={(e: DragEvent) => {
        if (
          isSelectionMode() ||
          isRemoving() ||
          isLocating() ||
          isRenaming() ||
          props.fadingOut
        ) {
          e.preventDefault();
          return;
        }
        props.onDragStart?.(e);
      }}
      onDragOver={(e: DragEvent) => {
        if (
          isSelectionMode() ||
          isRemoving() ||
          isLocating() ||
          props.fadingOut
        )
          return;
        props.onDragOver?.(e);
      }}
      onDragEnd={() => {
        if (isSelectionMode()) return;
        props.onDragEnd?.();
      }}
      onDrop={(e: DragEvent) => {
        if (
          isSelectionMode() ||
          isRemoving() ||
          isLocating() ||
          props.fadingOut
        )
          return;
        props.onDrop?.(e);
      }}
    >
      <Show when={props.dropIndicator === "above"}>
        <div class="absolute inset-x-0 top-0 z-10 h-0.5 bg-jade-400" />
      </Show>

      <div class="flex items-center gap-4">
        <Show
          when={isSelectionMode()}
          fallback={
            <div
              class={`shrink-0 transition-colors ${
                props.hidden
                  ? "pointer-events-none opacity-0"
                  : `cursor-grab text-ink-700 hover:text-ink-400 ${
                      isRemoving() || isLocating() || props.fadingOut
                        ? "opacity-30"
                        : ""
                    }`
              }`}
              onClick={(e: MouseEvent) => e.stopPropagation()}
            >
              <GripVertical size={16} />
            </div>
          }
        >
          <div class="shrink-0">
            <div
              class={`flex h-4 w-4 items-center justify-center rounded-sm border transition-colors ${
                props.selected
                  ? "border-jade-500 bg-jade-500 text-ink-950"
                  : "border-ink-600 text-transparent"
              }`}
            >
              <Check
                size={12}
                strokeWidth={3}
                class={props.selected ? "opacity-100" : "opacity-0"}
              />
            </div>
          </div>
        </Show>
        <Folder
          size={28}
          class={
            isRemoving()
              ? "shrink-0 text-red-400/60"
              : props.source.path_missing
                ? "shrink-0 text-red-400"
                : props.hidden
                  ? "shrink-0 text-ink-600"
                  : "shrink-0 text-jade-500"
          }
        />
        <div class="min-w-0 flex-1">
          <Show
            when={props.renaming}
            fallback={
              <div class="flex min-w-0 items-center gap-2">
                <p
                  class={`truncate text-sm font-medium ${props.hidden ? "text-ink-500" : "text-ink-100"}`}
                >
                  {props.source.name}
                </p>
                <Show when={props.source.path_missing}>
                  <span class="shrink-0 rounded-full border border-red-500/40 bg-red-950/40 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-red-300 uppercase">
                    Missing
                  </span>
                </Show>
              </div>
            }
          >
            {(renaming) => (
              <input
                ref={(el) =>
                  requestAnimationFrame(() => {
                    el.focus();
                    el.select();
                  })
                }
                type="text"
                class="w-full rounded border border-jade-500/60 bg-ink-900 px-1.5 py-0.5 text-sm font-medium text-ink-100 outline-none focus:ring-1 focus:ring-jade-500/60"
                value={renaming().value}
                onInput={(e) => renaming().onChange(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") renaming().onConfirm();
                  if (e.key === "Escape") renaming().onCancel();
                }}
                onFocusOut={() => renaming().onConfirm()}
                onClick={(e: MouseEvent) => e.stopPropagation()}
              />
            )}
          </Show>
          <p
            class={`text-xs ${props.source.path_missing ? "text-ink-600" : "text-ink-500"}`}
          >
            {props.source.manga_count} manga ·{" "}
            <span title={absoluteTime()}>last scan: {lastScanLabel()}</span>
          </p>
          <p class="truncate text-xs text-ink-600" title={props.source.path}>
            {props.source.path}
          </p>
          <Show
            when={
              props.scanStatus?.status === "error" && props.scanStatus.error
            }
          >
            <p class="mt-0.5 flex items-center gap-1 text-[11px] text-red-400/80">
              {props.scanStatus!.error}
              <button
                class="cursor-pointer text-red-300 underline hover:text-red-200"
                onClick={(e) => {
                  e.stopPropagation();
                  props.onRescan();
                }}
              >
                Retry
              </button>
            </p>
          </Show>
        </div>
        <Show when={!isRemoving() && !isLocating() && !isSelectionMode()}>
          {/* Scan-status badge — fades in over the overflow trigger area */}
          <Show when={props.scanStatus}>
            <div
              class="flex h-8 w-8 shrink-0 items-center justify-center transition-opacity duration-200"
              classList={{ "animate-fade-in": !!props.scanStatus }}
            >
              <Show when={props.scanStatus?.status === "scanning"}>
                <RefreshCw size={16} class="animate-spin text-jade-400" />
              </Show>
              <Show when={props.scanStatus?.status === "done"}>
                <Check size={16} class="text-jade-400" />
              </Show>
              <Show when={props.scanStatus?.status === "error"}>
                <AlertCircle size={16} class="text-red-400" />
              </Show>
            </div>
          </Show>
          <Show when={!props.scanStatus}>
            <DropdownMenu>
              <DropdownMenuTrigger
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-500 opacity-0 transition-colors group-hover:opacity-100 focus-within:opacity-100 hover:bg-ink-800 hover:text-ink-200 focus-visible:ring-2 focus-visible:ring-jade-500/60 focus-visible:outline-none"
                onClick={(e: MouseEvent) => e.stopPropagation()}
                tabIndex={-1}
              >
                <EllipsisVertical size={16} />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <Show when={props.source.path_missing}>
                  <DropdownMenuItem
                    onSelect={() => runMenuAction(props.onLocate)}
                  >
                    <Link2 size={14} />
                    Locate
                  </DropdownMenuItem>
                </Show>
                <DropdownMenuItem
                  onSelect={() => runMenuAction(props.onRescan)}
                  disabled={props.source.path_missing}
                >
                  <RefreshCw size={14} />
                  Re-scan
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => runMenuAction(props.onRename)}
                >
                  <Pencil size={14} />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => runMenuAction(props.onHide)}>
                  <Show
                    when={props.hidden}
                    fallback={
                      <>
                        <EyeOff size={14} /> Hide
                      </>
                    }
                  >
                    <Eye size={14} /> Show
                  </Show>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => runMenuAction(props.onRemove)}
                  class="text-red-400 focus:text-red-400"
                >
                  <Trash2 size={14} />
                  Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Show>
        </Show>
      </div>
      <Show when={props.removing}>
        {(removing) => (
          <div class="mt-2 border-t border-red-900/30 pt-2">
            <p class="mb-2 text-xs leading-relaxed text-red-300/80">
              All manga from this source will be removed from your library and
              history. Reading progress will be lost and won't return even if
              you re-add the source later.
            </p>
            <div class="flex items-center justify-end gap-2">
              <button
                class="h-7 cursor-pointer rounded-md px-2.5 text-xs font-medium text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-100"
                onClick={(e: MouseEvent) => {
                  e.stopPropagation();
                  removing().onCancel();
                }}
              >
                Cancel
              </button>
              <button
                class="h-7 cursor-pointer rounded-md px-2.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-950/40 hover:text-red-300"
                onClick={(e: MouseEvent) => {
                  e.stopPropagation();
                  removing().onConfirm();
                }}
              >
                Confirm remove
              </button>
            </div>
          </div>
        )}
      </Show>

      <Show when={props.locating}>
        {(locating) => (
          <div class="mt-2 border-t border-red-900/30 pt-2">
            <p class="mb-2 text-xs leading-relaxed text-red-300/80">
              {locating().error ||
                "This source folder is missing. Relocate it to keep your library, categories, and reading progress linked."}
            </p>
            <div class="flex items-center justify-end gap-2">
              <button
                class="h-7 cursor-pointer rounded-md px-2.5 text-xs font-medium text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-100"
                onClick={(e: MouseEvent) => {
                  e.stopPropagation();
                  locating().onCancel();
                }}
              >
                Cancel
              </button>
              <button
                class="h-7 cursor-pointer rounded-md px-2.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-950/40 hover:text-red-200"
                onClick={(e: MouseEvent) => {
                  e.stopPropagation();
                  locating().onConfirm();
                }}
              >
                {locating().error ? "Try again" : "Relocate"}
              </button>
            </div>
          </div>
        )}
      </Show>

      <Show when={props.dropIndicator === "below"}>
        <div class="absolute inset-x-0 bottom-0 z-10 h-0.5 bg-jade-400" />
      </Show>
    </div>
  );
}
