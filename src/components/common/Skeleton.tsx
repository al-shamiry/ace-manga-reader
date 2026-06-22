import { For } from "solid-js";

/** Skeleton that matches a MangaCard in the grid */
export function MangaCardSkeleton() {
  return (
    <div class="flex flex-col overflow-hidden rounded-lg bg-ink-900">
      <div class="skeleton h-60" />
      <div class="flex shrink-0 flex-col gap-1.5 px-2.5 py-2">
        <div class="skeleton h-3 w-4/5 rounded" />
        <div class="skeleton h-2.5 w-2/5 rounded" />
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
    <div class="flex items-center gap-3 border-b border-ink-800/50 px-4 py-3">
      <div class="skeleton h-3 flex-1 rounded" />
      <div class="skeleton h-3 w-6 shrink-0 rounded" />
      <div class="skeleton h-5 w-10 shrink-0 rounded" />
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
    <div class="relative flex flex-col overflow-hidden rounded-md border-b border-ink-800/40 px-4 py-3">
      <div class="flex items-center gap-4">
        <div class="skeleton h-4 w-4 shrink-0 rounded-sm" />
        <div class="skeleton h-7 w-7 shrink-0 rounded-md" />
        <div class="min-w-0 flex-1">
          <div class="skeleton h-4 w-3/5 rounded" />
          <div class="skeleton mt-1.5 h-3 w-2/5 rounded" />
          <div class="skeleton mt-1.5 h-3 w-4/5 rounded" />
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
