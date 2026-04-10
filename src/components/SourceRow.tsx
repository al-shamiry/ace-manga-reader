import { Show, createEffect, on } from "solid-js";
import { AlertCircle, Check, EllipsisVertical, EyeOff, Folder, Pencil, RefreshCw, Trash2 } from "lucide-solid";
import type { ScanStatus } from "../context/LibraryContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { formatRelativeDay } from "../lib/date";
import type { Source } from "../types";

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

interface SourceRowProps {
  source: Source;
  onClick: () => void;
  onRescan: () => void;
  onRename: () => void;
  onHide: () => void;
  onRemove: () => void;
  scanStatus?: ScanStatus;
  renaming?: RenameState;
  removing?: RemoveState;
  fadingOut?: boolean;
  onFadeOutDone?: () => void;
}

export function SourceRow(props: SourceRowProps) {
  let rowRef!: HTMLDivElement;
  const absoluteTime = () =>
    new Date(props.source.scanned_at * 1000).toLocaleString();
  const isRemoving = () => !!props.removing;
  const isRenaming = () => !!props.renaming;

  createEffect(on(() => props.fadingOut, (fading) => {
    if (!fading || !rowRef) return;
    // Capture current height so the collapse transition has a start value
    const h = rowRef.offsetHeight;
    rowRef.style.maxHeight = `${h}px`;
    // Force reflow before adding the collapsed state
    void rowRef.offsetHeight;
    rowRef.classList.add("source-row-fade-out");
  }));

  function handleTransitionEnd(e: TransitionEvent) {
    if (e.propertyName === "opacity" && props.fadingOut && props.onFadeOutDone) {
      props.onFadeOutDone();
    }
  }

  return (
    <div
      ref={rowRef}
      tabIndex={0}
      class={`group flex flex-col px-4 py-3 transition-colors border-b border-ink-800/40 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade-500/60 overflow-hidden ${
        isRemoving()
          ? "bg-red-950/20 border-red-900/40"
          : props.fadingOut
            ? ""
            : "cursor-pointer hover:bg-ink-900/40"
      }`}
      onClick={() => { if (!isRemoving() && !isRenaming() && !props.fadingOut) props.onClick(); }}
      onKeyDown={(e) => {
        if (isRemoving() && e.key === "Escape") {
          e.preventDefault();
          props.removing!.onCancel();
          return;
        }
        if (!isRemoving() && !isRenaming() && !props.fadingOut && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          props.onClick();
        }
      }}
      onTransitionEnd={handleTransitionEnd}
    >
      <div class="flex items-center gap-4">
        <Folder size={28} class={isRemoving() ? "text-red-400/60 shrink-0" : "text-jade-500 shrink-0"} />
        <div class="flex-1 min-w-0">
          <Show when={props.renaming} fallback={
            <p class="text-sm font-medium text-ink-100 truncate">{props.source.name}</p>
          }>
            {(renaming) => (
              <input
                ref={(el) => requestAnimationFrame(() => { el.focus(); el.select(); })}
                type="text"
                class="text-sm font-medium text-ink-100 bg-ink-900 border border-jade-500/60 rounded px-1.5 py-0.5 w-full outline-none focus:ring-1 focus:ring-jade-500/60"
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
          <p class="text-xs text-ink-500">
            {props.source.manga_count} manga ·{" "}
            <span title={absoluteTime()}>{formatRelativeDay(props.source.scanned_at)}</span>
          </p>
          <p class="text-xs text-ink-600 truncate" title={props.source.path}>
            {props.source.path}
          </p>
        </div>
        <Show when={!isRemoving()}>
          {/* Scan-status badge — fades in over the overflow trigger area */}
          <Show when={props.scanStatus}>
            <div class="flex h-8 w-8 shrink-0 items-center justify-center transition-opacity duration-200"
              classList={{ "animate-fade-in": !!props.scanStatus }}
            >
              <Show when={props.scanStatus === "scanning"}>
                <RefreshCw size={16} class="text-jade-400 animate-spin" />
              </Show>
              <Show when={props.scanStatus === "done"}>
                <Check size={16} class="text-jade-400" />
              </Show>
              <Show when={props.scanStatus === "error"}>
                <AlertCircle size={16} class="text-red-400" />
              </Show>
            </div>
          </Show>
          <Show when={!props.scanStatus}>
            <DropdownMenu>
              <DropdownMenuTrigger
                class="opacity-0 group-hover:opacity-100 focus-within:opacity-100 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-500 transition-colors hover:bg-ink-800 hover:text-ink-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade-500/60"
                onClick={(e: MouseEvent) => e.stopPropagation()}
                tabIndex={-1}
              >
                <EllipsisVertical size={16} />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={props.onRescan}>
                  <RefreshCw size={14} />
                  Re-scan
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={props.onRename}>
                  <Pencil size={14} />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={props.onHide}>
                  <EyeOff size={14} />
                  Hide
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={props.onRemove} class="text-red-400 focus:text-red-400">
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
          <div class="mt-2 pt-2 border-t border-red-900/30">
            <p class="text-xs text-red-300/80 leading-relaxed mb-2">
              All manga from this source will be removed from your library and history. Reading progress will be lost and won't return even if you re-add the source later.
            </p>
            <div class="flex items-center gap-2 justify-end">
              <button
                class="h-7 cursor-pointer rounded-md px-2.5 text-xs font-medium text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-100"
                onClick={(e: MouseEvent) => { e.stopPropagation(); removing().onCancel(); }}
              >
                Cancel
              </button>
              <button
                class="h-7 cursor-pointer rounded-md px-2.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-950/40 hover:text-red-300"
                onClick={(e: MouseEvent) => { e.stopPropagation(); removing().onConfirm(); }}
              >
                Confirm remove
              </button>
            </div>
          </div>
        )}
      </Show>
    </div>
  );
}
