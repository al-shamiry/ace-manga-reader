import { Show, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { Folder } from "lucide-solid";
import { open } from "@tauri-apps/plugin-dialog";
import { EmptyState } from "../components/EmptyState";
import { SourceGrid } from "../components/SourceGrid";
import {
  Toolbar,
  ToolbarInlineButton,
  ToolbarTitle,
} from "../components/ui/toolbar";
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

  // Open the native folder picker. Tauri's dialog supports paste-into-
  // address-bar for power-users, so we no longer need a separate text
  // input in the toolbar — keeps the chrome quiet and on-family.
  async function pickRoot() {
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected === "string" && selected) {
      await loadRoot(selected);
    }
  }

  return (
    <div class="flex flex-col flex-1 overflow-hidden">
      <Toolbar>
        <ToolbarTitle class="flex-1">Sources</ToolbarTitle>
        <ToolbarInlineButton onClick={pickRoot} title="Choose library folder">
          <Folder size={14} />
          {sources().length > 0 ? "Change folder" : "Choose folder"}
        </ToolbarInlineButton>
      </Toolbar>

      <div class="flex-1 min-h-0 flex flex-col overflow-hidden">
        <Show when={status() === "loading"}>
          <p class="px-6 py-4 text-sm text-ink-500">Loading...</p>
        </Show>
        <Show when={status() === "error"}>
          <p class="px-6 py-4 text-sm text-red-400">{error()}</p>
        </Show>
        <Show when={status() === "idle" && sources().length === 0}>
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
        </Show>
        <Show when={sources().length > 0}>
          <SourceGrid sources={sources()} onSelect={openSource} />
        </Show>
      </div>
    </div>
  );
}
