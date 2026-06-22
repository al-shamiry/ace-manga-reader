import { createMemo, Show } from "solid-js";

import { Check } from "lucide-solid";

import type { Chapter, ChapterStatus } from "~/types";

type ChapterRowProps = {
  chapter: Chapter;
  selectMode: boolean;
  selected: boolean;
  onClick: () => void;
};

function StatusBadge(props: { status: ChapterStatus }) {
  const badge = createMemo(() => {
    const status = props.status;
    if (status.type === "read") {
      return { label: "Done", class: "bg-ink-800 text-ink-500" };
    }
    if (status.type === "ongoing" && status.page > 0) {
      return {
        label: `Page ${status.page + 1}`,
        class: "bg-jade-900/50 text-jade-400",
      };
    }
    return { label: "New", class: "bg-ink-800 text-ink-100" };
  });

  return (
    <span
      class={`rounded px-1.5 py-0.5 text-[0.65rem] font-semibold ${badge().class}`}
    >
      {badge().label}
    </span>
  );
}

export function ChapterRow(props: ChapterRowProps) {
  return (
    <button
      class={`flex w-full items-center gap-3 border-b border-ink-800/50 px-4 py-3 text-left transition-colors hover:bg-ink-800/60 ${
        props.selectMode && props.selected ? "bg-jade-950/30" : ""
      }`}
      onClick={() => props.onClick()}
    >
      <Show when={props.selectMode}>
        <div
          class={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors ${
            props.selected
              ? "border-jade-500 bg-jade-500 text-ink-950"
              : "border-ink-600 text-transparent"
          }`}
        >
          <Check size={12} strokeWidth={3} />
        </div>
      </Show>
      <span class="flex-1 truncate text-sm text-ink-200">
        {props.chapter.title}
      </span>
      <span class="mr-2 shrink-0 text-xs text-ink-600">
        {props.chapter.page_count}p
      </span>
      <StatusBadge status={props.chapter.status} />
    </button>
  );
}
