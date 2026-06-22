import {
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import { useNavigate } from "@solidjs/router";

import { open } from "@tauri-apps/plugin-dialog";

import * as api from "~/api";
import type { Source } from "~/types";

import { createSourceSelection } from "~/hooks/createSourceSelection";

import { EmptyState } from "~/components/common/EmptyState";
import { SourceListSkeleton } from "~/components/common/Skeleton";
import { SourceRow } from "~/components/source/SourceRow";
import { SourcesToolbar } from "~/components/source/SourcesToolbar";
import { ToolbarSearchRow } from "~/components/ui/toolbar";

import { useSources } from "~/context/SourcesContext";
import { useViewLoading } from "~/context/ViewLoadingContext";

export function SourcesView() {
  const {
    sources,
    status,
    error,
    addSource,
    removeSource,
    relocateSource,
    setSourceHidden,
    refreshSources,
    initialLoad,
    scanStatus,
    scanSource,
    scanAllSources,
  } = useSources();
  const view = useViewLoading();
  const loadToken = view.busy();
  const navigate = useNavigate();
  const [showHidden, setShowHidden] = createSignal(false);
  const [searchQuery, setSearchQuery] = createSignal("");

  onMount(async () => {
    await initialLoad();
    view.ready(loadToken);
  });

  const sortedSources = createMemo(() =>
    [...sources()].sort((a, b) => a.sort_order - b.sort_order),
  );

  const filteredSources = createMemo(() => {
    const q = searchQuery().toLowerCase().trim();
    if (!q) return sortedSources();
    return sortedSources().filter((s) => s.name.toLowerCase().includes(q));
  });

  const visibleSources = createMemo(() =>
    filteredSources().filter((s) => !s.hidden),
  );

  const hiddenSources = createMemo(() =>
    filteredSources().filter((s) => s.hidden),
  );

  const selectableSources = createMemo(() =>
    showHidden() ? [...visibleSources(), ...hiddenSources()] : visibleSources(),
  );

  const isAnyScanning = createMemo(() =>
    Object.values(scanStatus()).some((s) => s.status === "scanning"),
  );

  const selection = createSourceSelection(sortedSources, selectableSources);

  const bulkHideLabel = createMemo<"Hide" | "Show">(() => {
    const selected = selection.selected();
    if (selected.length === 0) return "Hide";
    return selected.every((source) => source.hidden) ? "Show" : "Hide";
  });

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

  function enterSelection() {
    setRenamingId(null);
    setRemovingId(null);
    setLocatingId(null);
    selection.enter();
  }

  // ── Rename ────────────────────────────────────────────────────────────────────

  const [renamingId, setRenamingId] = createSignal<string | null>(null);
  const [renameValue, setRenameValue] = createSignal("");

  function startRename(source: Source) {
    if (selection.active()) selection.exit();
    setRemovingId(null);
    setRenamingId(source.id);
    setRenameValue(source.name);
  }

  async function confirmRename() {
    const id = renamingId();
    const name = renameValue().trim();
    if (!id || !name) {
      setRenamingId(null);
      return;
    }
    try {
      await api.sources.renameSource(id, name);
      await refreshSources();
    } catch (e) {
      console.error("Failed to rename source:", e);
    }
    setRenamingId(null);
  }

  // ── Remove / fade-out ─────────────────────────────────────────────────────────

  const [removingId, setRemovingId] = createSignal<string | null>(null);
  const [locatingId, setLocatingId] = createSignal<string | null>(null);
  const [fadingOutId, setFadingOutId] = createSignal<string | null>(null);
  const [locateError, setLocateError] = createSignal<string | null>(null);

  async function handleLocate(source: Source) {
    setLocateError(null);
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected !== "string" || !selected) return;
    try {
      await relocateSource(source.id, selected);
      setLocatingId(null);
    } catch (e) {
      setLocateError(String(e));
    }
  }

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

  function startRemove(sourceId: string) {
    if (selection.active()) selection.exit();
    setRenamingId(null);
    setLocatingId(null);
    setRemovingId(sourceId);
  }

  function startLocate(source: Source) {
    if (selection.active()) selection.exit();
    setRenamingId(null);
    setRemovingId(null);
    setLocateError(null);
    setLocatingId(source.id);
  }

  // ── Bulk actions ──────────────────────────────────────────────────────────────

  function handleBulkRescan() {
    const selected = selection.selected();
    if (selected.length === 0) return;
    for (const source of selected) {
      scanSource(source.id);
    }
    selection.exit();
  }

  async function handleBulkHideShow() {
    const selected = selection.selected();
    if (selected.length === 0) return;

    const shouldShow = selected.every((source) => source.hidden);

    try {
      for (const source of selected) {
        await setSourceHidden(source.id, !shouldShow);
      }
    } catch (e) {
      console.error("Failed to update source visibility:", e);
    } finally {
      selection.exit();
    }
  }

  function handleBulkRemoveRequest() {
    if (selection.count() === 0) return;
    selection.setBulkRemoving(true);
  }

  async function confirmBulkRemove() {
    const ids = selection.selectedIds();
    if (ids.length === 0) {
      selection.setBulkRemoving(false);
      return;
    }

    try {
      for (const id of ids) {
        await removeSource(id);
      }
    } catch (e) {
      console.error("Failed to bulk remove sources:", e);
    } finally {
      selection.exit();
    }
  }

  function handleViewKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape" && selection.active()) {
      e.preventDefault();
      e.stopPropagation();
      selection.exit();
      return;
    }

    if (
      selection.active() &&
      (e.ctrlKey || e.metaKey) &&
      e.key.toLowerCase() === "a"
    ) {
      e.preventDefault();
      e.stopPropagation();
      selection.toggleAll();
    }
  }

  onMount(() => {
    // Capture shortcuts at the window level so browser default Ctrl+A never wins
    // when focus is outside the SourcesView container.
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      handleViewKeyDown(e);
    };

    window.addEventListener("keydown", handleGlobalKeyDown, true);

    onCleanup(() => {
      window.removeEventListener("keydown", handleGlobalKeyDown, true);
    });
  });

  // ── Drag-to-reorder ──────────────────────────────────────────────────────────

  const [draggingId, setDraggingId] = createSignal<string | null>(null);
  const [dropTargetId, setDropTargetId] = createSignal<string | null>(null);
  const [dropPosition, setDropPosition] = createSignal<"above" | "below">(
    "below",
  );

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
      await api.sources.reorderSources(orderedIds);
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
        selectionMode={selection.active()}
        selected={selection.isSelected(source)}
        onToggleSelect={() => selection.toggle(source)}
        onClick={() =>
          source.path_missing ? startLocate(source) : openSource(source)
        }
        onLocate={() => handleLocate(source)}
        onRescan={() => scanSource(source.id)}
        onRename={() => startRename(source)}
        scanStatus={scanStatus()[source.id]}
        onHide={() => {
          setLocatingId(null);
          setSourceHidden(source.id, !hidden);
        }}
        onRemove={() => startRemove(source.id)}
        renaming={
          renamingId() === source.id
            ? {
                value: renameValue(),
                onChange: setRenameValue,
                onConfirm: confirmRename,
                onCancel: () => setRenamingId(null),
              }
            : undefined
        }
        removing={
          removingId() === source.id
            ? {
                onConfirm: confirmRemove,
                onCancel: () => setRemovingId(null),
              }
            : undefined
        }
        locating={
          locatingId() === source.id
            ? {
                onConfirm: () => handleLocate(source),
                onCancel: () => {
                  setLocatingId(null);
                  setLocateError(null);
                },
                error: locateError() ?? undefined,
              }
            : undefined
        }
        fadingOut={fadingOutId() === source.id}
        onFadeOutDone={() => handleFadeOutDone(source.id)}
        dragging={!hidden ? draggingId() === source.id : undefined}
        dropIndicator={
          !hidden && dropTargetId() === source.id && draggingId() !== source.id
            ? dropPosition()
            : undefined
        }
        onDragStart={!hidden ? (e) => handleDragStart(e, source.id) : undefined}
        onDragOver={!hidden ? (e) => handleDragOver(e, source.id) : undefined}
        onDragEnd={!hidden ? handleDragEnd : undefined}
        onDrop={!hidden ? (e) => handleDrop(e, source.id) : undefined}
      />
    );
  }

  return (
    <div
      class="flex flex-1 flex-col overflow-hidden"
      onKeyDown={handleViewKeyDown}
    >
      <SourcesToolbar
        selectionMode={selection.active()}
        selectedCount={selection.count()}
        selectableCount={selectableSources().length}
        bulkRemoving={selection.bulkRemoving()}
        bulkHideLabel={bulkHideLabel()}
        isAnyScanning={isAnyScanning()}
        showHidden={showHidden()}
        onAddSource={handleAddSource}
        onEnterSelection={enterSelection}
        onRescanAll={handleRescanAll}
        onToggleHidden={handleToggleHidden}
        onSelectAll={selection.selectAll}
        onSelectNone={selection.selectNone}
        onInvert={selection.invert}
        onBulkRescan={handleBulkRescan}
        onBulkHideShow={handleBulkHideShow}
        onBulkRemoveRequest={handleBulkRemoveRequest}
        onExitSelection={selection.exit}
      />

      <ToolbarSearchRow
        value={searchQuery()}
        onInput={setSearchQuery}
        placeholder="Search sources…"
        autofocus
      />

      <Show when={selection.active() && selection.bulkRemoving()}>
        <div class="border-b border-red-900/30 bg-red-950/20 px-4 py-2">
          <div class="mx-auto flex max-w-3xl items-start justify-between gap-3">
            <p class="text-xs leading-relaxed text-red-300/85">
              Remove {selection.count()}{" "}
              {selection.count() === 1 ? "source" : "sources"}? All manga from{" "}
              {selection.count() === 1 ? "this source" : "these sources"} will
              be removed from your library and history. Reading progress will be
              lost and will not return even if you re-add{" "}
              {selection.count() === 1 ? "it" : "them"} later.
            </p>
            <div class="flex shrink-0 items-center gap-2">
              <button
                class="h-7 cursor-pointer rounded-md px-2.5 text-xs font-medium text-ink-300 transition-colors hover:bg-ink-800 hover:text-ink-100"
                onClick={() => selection.setBulkRemoving(false)}
              >
                Cancel
              </button>
              <button
                class="h-7 cursor-pointer rounded-md px-2.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-950/40 hover:text-red-200"
                onClick={confirmBulkRemove}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      </Show>

      <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Show when={status() === "loading"}>
          <div class="flex-1 overflow-y-auto">
            <div class="mx-auto max-w-3xl px-4 py-2">
              <SourceListSkeleton count={3} />
            </div>
          </div>
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
            <div class="mt-6 w-full max-w-md border-t border-ink-800/80 pt-6">
              <p class="mb-3 text-[0.7rem] font-medium tracking-wider text-ink-600 uppercase">
                Expected layout
              </p>
              <pre class="font-mono text-xs leading-relaxed text-ink-500">
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
        <Show
          when={
            sources().length > 0 &&
            visibleSources().length === 0 &&
            hiddenSources().length === 0
          }
        >
          <EmptyState
            eyebrow="No results"
            title="No sources match your search."
            description="Try a different query or clear the search to see all sources."
          />
        </Show>
        <Show
          when={
            sources().length > 0 &&
            (visibleSources().length > 0 || hiddenSources().length > 0)
          }
        >
          <div class="flex-1 overflow-y-auto">
            <div class="mx-auto max-w-3xl px-4 py-2">
              <For each={visibleSources()}>
                {(source) => renderSourceRow(source)}
              </For>

              <Show when={showHidden() && hiddenSources().length > 0}>
                <div class="mt-4 border-t border-ink-800/40 pt-4">
                  <p class="mb-2 px-4 text-xs font-medium tracking-wider text-ink-600 uppercase">
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
