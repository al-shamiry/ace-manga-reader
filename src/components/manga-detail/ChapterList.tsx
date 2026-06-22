import { For, Show } from "solid-js";

import type { Chapter } from "~/types";

import { EmptyState } from "~/components/common/EmptyState";
import { ChapterRow } from "~/components/manga-detail/ChapterRow";

type ChapterListProps = {
  loading: boolean;
  error: string;
  chapters: Chapter[];
  visible: Chapter[];
  filterActive: boolean;
  selectMode: boolean;
  isSelected: (chapter: Chapter) => boolean;
  onChapterClick: (chapter: Chapter) => void;
};

export function ChapterList(props: ChapterListProps) {
  return (
    <>
      {/* Chapter count */}
      <div class="shrink-0 border-b border-ink-800 px-4 py-2 text-xs font-semibold tracking-wider text-ink-500 uppercase">
        <Show when={!props.loading} fallback="…">
          <Show
            when={props.filterActive}
            fallback={
              <>
                {props.chapters.length}{" "}
                {props.chapters.length === 1 ? "chapter" : "chapters"}
              </>
            }
          >
            {props.visible.length} of {props.chapters.length} chapters
          </Show>
        </Show>
      </div>

      {/* Chapter list */}
      <div class="flex-1 overflow-y-auto">
        <Show when={props.error}>
          <p class="px-4 py-3 text-sm text-red-400">{props.error}</p>
        </Show>

        <Show
          when={!props.loading && props.chapters.length === 0 && !props.error}
        >
          <EmptyState
            eyebrow="Chapters"
            title="No chapters in this folder."
            description={
              <>
                Ace expects this manga to contain either chapter subfolders
                (each with images inside) or{" "}
                <span class="font-mono text-ink-300">.cbz</span> archives. Check
                the folder contents and try refreshing.
              </>
            }
          />
        </Show>

        <Show
          when={
            !props.loading &&
            props.chapters.length > 0 &&
            props.visible.length === 0 &&
            !props.error
          }
        >
          <EmptyState
            eyebrow="No results"
            title="No chapters match this filter."
            description="Try adjusting the chapter status filter."
          />
        </Show>

        <For each={props.visible}>
          {(chapter) => (
            <ChapterRow
              chapter={chapter}
              selectMode={props.selectMode}
              selected={props.isSelected(chapter)}
              onClick={() => props.onChapterClick(chapter)}
            />
          )}
        </For>
      </div>
    </>
  );
}
