import { For } from "solid-js";

/** Skeleton that matches a MangaCard in the grid */
export function MangaCardSkeleton() {
  return (
    <div class="flex flex-col bg-ink-900 rounded-lg overflow-hidden">
      <div class="skeleton h-60" />
      <div class="px-2.5 py-2 shrink-0 flex flex-col gap-1.5">
        <div class="skeleton h-3 rounded w-4/5" />
        <div class="skeleton h-2.5 rounded w-2/5" />
      </div>
    </div>
  );
}

/** N manga card skeletons inside the existing grid container */
export function MangaGridSkeleton(props: { count?: number }) {
  return (
    <div class="manga-grid">
      <For each={Array(props.count ?? 12).fill(0)}>
        {() => <MangaCardSkeleton />}
      </For>
    </div>
  );
}

/** Skeleton that matches a chapter list row in MangaDetailView */
export function ChapterRowSkeleton() {
  return (
    <div class="flex items-center gap-3 px-4 py-3 border-b border-ink-800/50">
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

/** Skeleton that matches a SourceRow in SourcesView */
export function SourceRowSkeleton() {
  return (
    <div class="relative flex flex-col px-4 py-3 border-b border-ink-800/40 rounded-md overflow-hidden">
      <div class="flex items-center gap-4">
        <div class="skeleton h-4 w-4 rounded-sm shrink-0" />
        <div class="skeleton h-7 w-7 rounded-md shrink-0" />
        <div class="flex-1 min-w-0">
          <div class="skeleton h-4 rounded w-3/5" />
          <div class="skeleton h-3 rounded w-2/5 mt-1.5" />
          <div class="skeleton h-3 rounded w-4/5 mt-1.5" />
        </div>
      </div>
    </div>
  );
}

/** N source row skeletons */
export function SourceListSkeleton(props: { count?: number }) {
  return (
    <For each={Array(props.count ?? 3).fill(0)}>
      {() => <SourceRowSkeleton />}
    </For>
  );
}
