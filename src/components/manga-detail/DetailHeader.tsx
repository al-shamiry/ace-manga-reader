import { Show } from "solid-js";

import { convertFileSrc } from "@tauri-apps/api/core";
import { Bookmark, Play } from "lucide-solid";

import type { Category, Manga } from "~/types";

import { CategoryMenu } from "~/components/library/CategoryMenu";
import { Button } from "~/components/ui/button";
import { DropdownMenuTrigger } from "~/components/ui/dropdown-menu";

type DetailHeaderProps = {
  manga: Manga;
  primaryLabel: string | null;
  onStartReading: () => void;
  isInLibrary: boolean;
  categories: Category[];
  currentCategoryIds: string[];
  onMenuOpenChange: (open: boolean) => void;
  onToggleCategory: (catId: string) => void;
  onRemoveFromLibrary: () => void;
};

export function DetailHeader(props: DetailHeaderProps) {
  return (
    <div class="flex shrink-0 gap-5 border-b border-ink-800 p-5">
      <img
        src={convertFileSrc(props.manga.cover_path)}
        alt={props.manga.title}
        class="w-28 shrink-0 rounded-lg bg-ink-800 object-cover shadow-lg shadow-black/40"
      />
      <div class="flex min-w-0 flex-1 flex-col justify-center gap-3">
        <h1 class="line-clamp-2 font-display text-display text-ink-100">
          {props.manga.title}
        </h1>
        <p class="text-xs font-medium tracking-wider text-ink-500 uppercase">
          {props.manga.chapter_count}{" "}
          {props.manga.chapter_count === 1 ? "chapter" : "chapters"}
        </p>
        <div class="mt-1 flex items-center gap-2">
          <Show when={props.primaryLabel}>
            <Button variant="primary" onClick={() => props.onStartReading()}>
              <Play size={12} />
              {props.primaryLabel}
            </Button>
          </Show>
          <CategoryMenu
            mode="toggle"
            categories={props.categories}
            selectedIds={props.currentCategoryIds}
            onToggle={props.onToggleCategory}
            isInLibrary={props.isInLibrary}
            onRemoveFromLibrary={props.onRemoveFromLibrary}
            onOpenChange={props.onMenuOpenChange}
            trigger={
              <DropdownMenuTrigger
                as={Button}
                variant={props.isInLibrary ? "primary" : "ghost"}
                title={
                  props.isInLibrary
                    ? "Edit library categories"
                    : "Add to library"
                }
              >
                <Bookmark
                  size={14}
                  fill={props.isInLibrary ? "currentColor" : "none"}
                />
                {props.isInLibrary ? "In Library" : "Add to Library"}
              </DropdownMenuTrigger>
            }
          />
        </div>
      </div>
    </div>
  );
}
