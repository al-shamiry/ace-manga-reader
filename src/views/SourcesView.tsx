import { Show, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { DirectoryPicker } from "../components/DirectoryPicker";
import { EmptyState } from "../components/EmptyState";
import { SourceGrid } from "../components/SourceGrid";
import { useLibrary } from "../context/LibraryContext";
import { useViewLoading } from "../context/ViewLoadingContext";
import type { Source } from "../types";

export function SourcesView() {
  const { sources, status, error, loadRoot, initialLoad } = useLibrary();
  const view = useViewLoading();
  // Mark busy synchronously so the overlay paints on the first frame.
  const loadToken = view.busy();
  const navigate = useNavigate();

  // SourcesView reads everything from LibraryContext — wait on its initial
  // load and then declare ready. No local async work to coordinate.
  onMount(async () => {
    await initialLoad();
    view.ready(loadToken);
  });

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
        <p class="px-6 py-4 text-sm text-ink-500">Loading...</p>
      </Show>
      <Show when={status() === "error"}>
        <p class="px-6 py-4 text-sm text-red-400">{error()}</p>
      </Show>
      <Show when={status() === "idle" && sources().length === 0}>
        {/* Wrap in a flex-1 block container so EmptyState's h-full resolves
            against the post-picker space rather than the whole view. */}
        <div class="flex-1 min-h-0">
          <EmptyState
            eyebrow="Sources"
            title="No source folders here."
            description="Ace looks one level inside the folder you picked and treats each subfolder as a source. Pick a parent that contains your source folders, or add a source folder to the current path."
          >
            <div class="mt-6 pt-6 border-t border-ink-800/80 w-full max-w-md">
              <p class="text-[0.7rem] uppercase tracking-wider text-ink-600 font-medium mb-3">
                Expected layout
              </p>
              <pre class="text-xs text-ink-500 leading-relaxed font-mono">
{`root/               ← the folder you are going to pick
  source/           ← each subfolder is a source (a collection of manga)
    Manga Title/    ← the manga
      Chapter 01/   ← folders that contain images (pages)
      Chapter 02/
    Another Manga/
      vol01.cbz     ← you can also have .cbz files instead of folders`}
              </pre>
            </div>
          </EmptyState>
        </div>
      </Show>
      <Show when={sources().length > 0}>
        <SourceGrid sources={sources()} onSelect={openSource} />
      </Show>
    </>
  );
}
