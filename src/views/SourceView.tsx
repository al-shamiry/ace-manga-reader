import { Show } from "solid-js";
import { ArrowLeft, RefreshCw, BookOpen } from "lucide-solid";
import { Button } from "../components/Button";
import { ComicGrid } from "../components/ComicGrid";
import type { Comic, Source } from "../types";

interface Props {
  source: Source;
  comics: Comic[];
  status: "idle" | "loading" | "error";
  error: string;
  onBack: () => void;
  onRefresh: () => void;
}

export function SourceView(props: Props) {
  return (
    <>
      <div class="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <Button variant="ghost" onClick={props.onBack}>
          <ArrowLeft size={14} />
          Back
        </Button>
        <span class="flex-1 text-sm font-semibold text-zinc-100 truncate">
          {props.source.name}
        </span>
        <Button variant="ghost" iconOnly onClick={props.onRefresh} title="Re-scan folder">
          <RefreshCw size={14} />
        </Button>
      </div>
      <Show when={props.status === "loading"}>
        <p class="px-6 py-4 text-sm text-zinc-500">Scanning...</p>
      </Show>
      <Show when={props.status === "error"}>
        <p class="px-6 py-4 text-sm text-red-400">{props.error}</p>
      </Show>
      <Show when={props.status === "idle" && props.comics.length === 0}>
        <div class="flex flex-col items-center justify-center flex-1 gap-4 text-center px-8">
          <div class="p-5 bg-zinc-900 rounded-2xl text-zinc-600">
            <BookOpen size={48} stroke-width={1} />
          </div>
          <div>
            <p class="text-zinc-300 font-medium">No comics found</p>
            <p class="text-zinc-600 text-sm mt-1">This source doesn't contain any recognised comics</p>
          </div>
        </div>
      </Show>
      <Show when={props.comics.length > 0}>
        <ComicGrid comics={props.comics} />
      </Show>
    </>
  );
}
