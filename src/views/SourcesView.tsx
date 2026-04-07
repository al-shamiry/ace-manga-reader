import { Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { DirectoryPicker } from "../components/DirectoryPicker";
import { SourceGrid } from "../components/SourceGrid";
import { useLibrary } from "../context/LibraryContext";
import type { Source } from "../types";

export function SourcesView() {
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
        <div class="flex flex-col items-start justify-center flex-1 max-w-md mx-auto px-10 gap-3">
          <p class="text-xs uppercase tracking-[0.2em] text-zinc-600 font-medium">
            Sources
          </p>
          <h2 class="font-display text-xl text-zinc-100">
            No source folders here.
          </h2>
          <p class="text-sm text-zinc-500 leading-relaxed">
            Ace looks one level inside the folder you picked and treats each
            subfolder as a source. Pick a parent that contains your source
            folders, or add a source folder to the current path.
          </p>
        </div>
      </Show>
      <Show when={sources().length > 0}>
        <SourceGrid sources={sources()} onSelect={openSource} />
      </Show>
    </>
  );
}
