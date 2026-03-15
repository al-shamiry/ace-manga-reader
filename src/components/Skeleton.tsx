import { For } from "solid-js";

/** Skeleton that matches a ComicCard in the grid */
export function ComicCardSkeleton() {
  return (
    <div class="flex flex-col bg-zinc-900 rounded-lg overflow-hidden">
      <div class="skeleton flex-1 min-h-0" />
      <div class="px-2.5 py-2 shrink-0 flex flex-col gap-1.5">
        <div class="skeleton h-3 rounded w-4/5" />
        <div class="skeleton h-2.5 rounded w-2/5" />
      </div>
    </div>
  );
}

/** N comic card skeletons inside the existing grid container */
export function ComicGridSkeleton(props: { count?: number }) {
  return (
    <div class="comic-grid">
      <For each={Array(props.count ?? 12).fill(0)}>
        {() => <ComicCardSkeleton />}
      </For>
    </div>
  );
}

/** Skeleton that matches a chapter list row in MangaDetailView */
export function ChapterRowSkeleton() {
  return (
    <div class="flex items-center gap-3 px-4 py-3 border-b border-zinc-800/50">
      <div class="skeleton h-3 rounded flex-1" />
      <div class="skeleton h-3 rounded w-6 shrink-0" />
      <div class="skeleton h-5 rounded w-10 shrink-0" />
    </div>
  );
}

/** N chapter row skeletons */
export function ChapterListSkeleton(props: { count?: number }) {
  return (
    <For each={Array(props.count ?? 8).fill(0)}>
      {() => <ChapterRowSkeleton />}
    </For>
  );
}
