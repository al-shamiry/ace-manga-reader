import type { Source } from "../types";

interface Props {
  source: Source;
  onClick: () => void;
}

export function SourceCard(props: Props) {
  return (
    <div
      onClick={props.onClick}
      class="flex flex-col items-center justify-center gap-2.5 bg-zinc-900 rounded-lg cursor-pointer p-4 transition-all duration-150 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/50 will-change-transform"
    >
      <div class="text-indigo-500 w-10 h-10 shrink-0">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
        </svg>
      </div>
      <div class="text-center min-w-0 w-full">
        <p class="text-xs font-medium text-zinc-100 truncate">{props.source.name}</p>
        <p class="text-[0.7rem] text-zinc-500 mt-0.5">{props.source.manga_count} manga</p>
      </div>
    </div>
  );
}
