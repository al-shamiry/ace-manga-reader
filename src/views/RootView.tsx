import { Show } from "solid-js";
import { Library } from "lucide-solid";
import { DirectoryPicker } from "../components/DirectoryPicker";
import { SourceGrid } from "../components/SourceGrid";
import type { Source } from "../types";

interface Props {
  sources: Source[];
  status: "idle" | "loading" | "error";
  error: string;
  onSelect: (path: string) => void;
  onSourceOpen: (source: Source) => void;
}

export function RootView(props: Props) {
  return (
    <>
      <DirectoryPicker
        onSelect={props.onSelect}
        onRefresh={() => {}}
        hasLibrary={props.sources.length > 0}
      />
      <Show when={props.status === "loading"}>
        <p class="px-6 py-4 text-sm text-zinc-500">Loading...</p>
      </Show>
      <Show when={props.status === "error"}>
        <p class="px-6 py-4 text-sm text-red-400">{props.error}</p>
      </Show>
      <Show when={props.status === "idle" && props.sources.length === 0}>
        <div class="flex flex-col items-center justify-center flex-1 gap-4 text-center px-8">
          <div class="p-5 bg-zinc-900 rounded-2xl text-zinc-600">
            <Library size={48} stroke-width={1} />
          </div>
          <div>
            <p class="text-zinc-300 font-medium">No library selected</p>
            <p class="text-zinc-600 text-sm mt-1">Pick a folder above to get started</p>
          </div>
        </div>
      </Show>
      <Show when={props.sources.length > 0}>
        <SourceGrid sources={props.sources} onSelect={props.onSourceOpen} />
      </Show>
    </>
  );
}
