import { Show } from "solid-js";
import { EllipsisVertical, EyeOff, Folder, Pencil, RefreshCw, Trash2 } from "lucide-solid";
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

interface SourceRowProps {
  source: Source;
  onClick: () => void;
  onRescan: () => void;
  onRename: () => void;
  onHide: () => void;
  onRemove: () => void;
  renaming?: RenameState;
}

export function SourceRow(props: SourceRowProps) {
  const absoluteTime = () =>
    new Date(props.source.scanned_at * 1000).toLocaleString();

  return (
    <div
      tabIndex={0}
      class="group flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-ink-900/40 transition-colors border-b border-ink-800/40 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade-500/60"
      onClick={props.onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          props.onClick();
        }
      }}
    >
      <Folder size={28} class="text-jade-500 shrink-0" />
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
    </div>
  );
}
