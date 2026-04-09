import { For, Show, createMemo, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { Eye, Plus, RefreshCw } from "lucide-solid";
import { open } from "@tauri-apps/plugin-dialog";
import { EmptyState } from "../components/EmptyState";
import { SourceRow } from "../components/SourceRow";
import {
  Toolbar,
  ToolbarActions,
  ToolbarButton,
  ToolbarInlineButton,
  ToolbarTitle,
} from "../components/ui/toolbar";
import { useLibrary } from "../context/LibraryContext";
import { useViewLoading } from "../context/ViewLoadingContext";
import type { Source } from "../types";

export function SourcesView() {
  const { sources, status, error, loadRoot, initialLoad } = useLibrary();
  const view = useViewLoading();
  const loadToken = view.busy();
  const navigate = useNavigate();

  onMount(async () => {
    await initialLoad();
    view.ready(loadToken);
  });

  const sortedSources = createMemo(() =>
    [...sources()].sort((a, b) => a.sort_order - b.sort_order)
  );

  function openSource(source: Source) {
    navigate(`/source/${source.id}`);
  }

  async function handleAddSource() {
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected === "string" && selected) {
      await loadRoot(selected);
    }
  }

  function handleRescanAll() {
    console.log("TODO 4.5");
  }

  function handleToggleHidden() {
    console.log("TODO 4.7");
  }

  return (
    <div class="flex flex-col flex-1 overflow-hidden">
      <Toolbar>
        <ToolbarTitle class="flex-1">Sources</ToolbarTitle>
        <ToolbarActions>
          <ToolbarInlineButton onClick={handleAddSource}>
            <Plus size={14} /> Add source
          </ToolbarInlineButton>
          <ToolbarButton onClick={handleRescanAll} title="Re-scan all sources">
            <RefreshCw size={16} />
          </ToolbarButton>
          <ToolbarButton onClick={handleToggleHidden} title="Show hidden sources">
            <Eye size={16} />
          </ToolbarButton>
        </ToolbarActions>
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
            action={{ label: "Choose library folder", onClick: handleAddSource }}
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
          <div class="flex-1 overflow-y-auto">
            <div class="max-w-3xl mx-auto px-4 py-2">
              <For each={sortedSources()}>
                {(source) => (
                  <SourceRow
                    source={source}
                    onClick={() => openSource(source)}
                    onRescan={() => console.log("TODO 4.5:", source.id)}
                    onRename={() => console.log("TODO 4.3:", source.id)}
                    onHide={() => console.log("TODO 4.7:", source.id)}
                    onRemove={() => console.log("TODO 4.4:", source.id)}
                  />
                )}
              </For>
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
}
