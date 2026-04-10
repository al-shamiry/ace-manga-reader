import { For, Show, createMemo, createSignal, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { Eye, EyeOff, Plus, RefreshCw } from "lucide-solid";
import { invoke } from "@tauri-apps/api/core";
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
  const { sources, status, error, addSource, removeSource, setSourceHidden, refreshSources, initialLoad, scanStatus, scanSource, scanAllSources } = useLibrary();
  const view = useViewLoading();
  const loadToken = view.busy();
  const navigate = useNavigate();
  const [showHidden, setShowHidden] = createSignal(false);

  onMount(async () => {
    await initialLoad();
    view.ready(loadToken);
  });

  const sortedSources = createMemo(() =>
    [...sources()].sort((a, b) => a.sort_order - b.sort_order)
  );

  const visibleSources = createMemo(() =>
    sortedSources().filter((s) => !s.hidden)
  );

  const hiddenSources = createMemo(() =>
    sortedSources().filter((s) => s.hidden)
  );

  const isAnyScanning = createMemo(() =>
    Object.values(scanStatus()).some((s) => s === "scanning")
  );

  function openSource(source: Source) {
    navigate(`/source/${source.id}`);
  }

  async function handleAddSource() {
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected === "string" && selected) {
      await addSource(selected);
    }
  }

  function handleRescanAll() {
    scanAllSources();
  }

  function handleToggleHidden() {
    setShowHidden((prev) => !prev);
  }

  // ── Rename ────────────────────────────────────────────────────────────────────

  const [renamingId, setRenamingId] = createSignal<string | null>(null);
  const [renameValue, setRenameValue] = createSignal("");

  function startRename(source: Source) {
    setRenamingId(source.id);
    setRenameValue(source.name);
  }

  async function confirmRename() {
    const id = renamingId();
    const name = renameValue().trim();
    if (!id || !name) { setRenamingId(null); return; }
    try {
      await invoke("rename_source", { sourceId: id, name });
      await refreshSources();
    } catch (e) {
      console.error("Failed to rename source:", e);
    }
    setRenamingId(null);
  }

  // ── Remove / fade-out ─────────────────────────────────────────────────────────

  const [removingId, setRemovingId] = createSignal<string | null>(null);
  const [fadingOutId, setFadingOutId] = createSignal<string | null>(null);

  async function confirmRemove() {
    const id = removingId();
    if (!id) return;
    setRemovingId(null);
    setFadingOutId(id);
  }

  async function handleFadeOutDone(id: string) {
    setFadingOutId(null);
    try {
      await removeSource(id);
    } catch (e) {
      console.error("Failed to remove source:", e);
    }
  }

  // ── Drag-to-reorder ──────────────────────────────────────────────────────────

  const [draggingId, setDraggingId] = createSignal<string | null>(null);
  const [dropTargetId, setDropTargetId] = createSignal<string | null>(null);
  const [dropPosition, setDropPosition] = createSignal<"above" | "below">("below");

  function handleDragStart(e: DragEvent, sourceId: string) {
    setDraggingId(sourceId);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", sourceId);
    }
  }

  function handleDragOver(e: DragEvent, sourceId: string) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    setDropPosition(e.clientY < mid ? "above" : "below");
    setDropTargetId(sourceId);
  }

  function handleDragEnd() {
    setDraggingId(null);
    setDropTargetId(null);
  }

  async function handleDrop(e: DragEvent, targetId: string) {
    e.preventDefault();
    const fromId = draggingId();
    const pos = dropPosition();
    setDraggingId(null);
    setDropTargetId(null);

    if (!fromId || fromId === targetId) return;

    const items = [...sortedSources()];
    const fromIdx = items.findIndex((s) => s.id === fromId);
    if (fromIdx === -1) return;

    const [moved] = items.splice(fromIdx, 1);
    const targetNewIdx = items.findIndex((s) => s.id === targetId);
    if (targetNewIdx === -1) return;

    const insertAt = pos === "below" ? targetNewIdx + 1 : targetNewIdx;
    items.splice(insertAt, 0, moved);

    const orderedIds = items.map((s) => s.id);

    try {
      await invoke("reorder_sources", { orderedIds });
      await refreshSources();
    } catch (err) {
      console.error("Failed to reorder sources:", err);
      await refreshSources();
    }
  }

  // ── Row renderer ──────────────────────────────────────────────────────────────

  function renderSourceRow(source: Source, hidden?: boolean) {
    return (
      <SourceRow
        source={source}
        hidden={hidden}
        onClick={() => openSource(source)}
        onRescan={() => scanSource(source.id)}
        onRename={() => startRename(source)}
        scanStatus={scanStatus()[source.id]}
        onHide={() => setSourceHidden(source.id, !hidden)}
        onRemove={() => setRemovingId(source.id)}
        renaming={renamingId() === source.id ? {
          value: renameValue(),
          onChange: setRenameValue,
          onConfirm: confirmRename,
          onCancel: () => setRenamingId(null),
        } : undefined}
        removing={removingId() === source.id ? {
          onConfirm: confirmRemove,
          onCancel: () => setRemovingId(null),
        } : undefined}
        fadingOut={fadingOutId() === source.id}
        onFadeOutDone={() => handleFadeOutDone(source.id)}
        dragging={!hidden ? draggingId() === source.id : undefined}
        dropIndicator={!hidden && dropTargetId() === source.id && draggingId() !== source.id ? dropPosition() : undefined}
        onDragStart={!hidden ? (e) => handleDragStart(e, source.id) : undefined}
        onDragOver={!hidden ? (e) => handleDragOver(e, source.id) : undefined}
        onDragEnd={!hidden ? handleDragEnd : undefined}
        onDrop={!hidden ? (e) => handleDrop(e, source.id) : undefined}
      />
    );
  }

  return (
    <div class="flex flex-col flex-1 overflow-hidden">
      <Toolbar>
        <ToolbarTitle class="flex-1">Sources</ToolbarTitle>
        <ToolbarActions>
          <ToolbarInlineButton onClick={handleAddSource}>
            <Plus size={14} /> Add source
          </ToolbarInlineButton>
          <ToolbarButton onClick={handleRescanAll} title="Re-scan all sources" disabled={isAnyScanning()}>
            <RefreshCw size={16} class={isAnyScanning() ? "animate-spin" : ""} />
          </ToolbarButton>
          <ToolbarButton
            onClick={handleToggleHidden}
            title={showHidden() ? "Hide hidden sources" : "Show hidden sources"}
            class={showHidden() ? "text-jade-400" : ""}
          >
            <Show when={showHidden()} fallback={<Eye size={16} />}>
              <EyeOff size={16} />
            </Show>
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
            title="No source folders yet."
            description="A source is a folder that contains manga. Pick a folder and Ace will treat each subfolder inside it as a manga title."
            action={{ label: "Add source folder", onClick: handleAddSource }}
          >
            <div class="mt-6 pt-6 border-t border-ink-800/80 w-full max-w-md">
              <p class="text-[0.7rem] uppercase tracking-wider text-ink-600 font-medium mb-3">
                Expected layout
              </p>
              <pre class="text-xs text-ink-500 leading-relaxed font-mono">
{`source/           ← the folder you pick (a collection of manga)
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
              <For each={visibleSources()}>
                {(source) => renderSourceRow(source)}
              </For>

              <Show when={showHidden() && hiddenSources().length > 0}>
                <div class="mt-4 pt-4 border-t border-ink-800/40">
                  <p class="text-xs uppercase tracking-wider text-ink-600 font-medium mb-2 px-4">
                    Hidden
                  </p>
                  <For each={hiddenSources()}>
                    {(source) => renderSourceRow(source, true)}
                  </For>
                </div>
              </Show>
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
}
