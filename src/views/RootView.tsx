import { Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { Library } from "lucide-solid";
import { DirectoryPicker } from "../components/DirectoryPicker";
import { SourceGrid } from "../components/SourceGrid";
import { useLibrary } from "../context/LibraryContext";
import type { Source } from "../types";

export function RootView() {
  const { sources, status, error, loadRoot } = useLibrary();
  const navigate = useNavigate();

  function openSource(source: Source) {
    navigate(`/source/${source.id}`);
  }

  return (
    <>
      <DirectoryPicker
        onSelect={loadRoot}
        onRefresh={() => {}}
        hasLibrary={sources().length > 0}
      />
      <Show when={status() === "loading"}>
        <p class="px-6 py-4 text-sm text-zinc-500">Loading...</p>
      </Show>
      <Show when={status() === "error"}>
        <p class="px-6 py-4 text-sm text-red-400">{error()}</p>
      </Show>
      <Show when={status() === "idle" && sources().length === 0}>
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
      <Show when={sources().length > 0}>
        <SourceGrid sources={sources()} onSelect={openSource} />
      </Show>
    </>
  );
}
