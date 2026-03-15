import { createSignal, Show, onMount } from "solid-js";
import { ArrowLeft, RefreshCw, Library, BookOpen } from "lucide-solid";
import { Button } from "./components/Button";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { DirectoryPicker } from "./components/DirectoryPicker";
import { SourceGrid } from "./components/SourceGrid";
import { ComicGrid } from "./components/ComicGrid";
import type { Comic, Source } from "./types";
import "./App.css";

type View = "root" | "source";
type Status = "idle" | "loading" | "error";

function App() {
  const [view, setView] = createSignal<View>("root");
  const [sources, setSources] = createSignal<Source[]>([]);
  const [currentSource, setCurrentSource] = createSignal<Source | null>(null);
  const [comics, setComics] = createSignal<Comic[]>([]);
  const [status, setStatus] = createSignal<Status>("idle");
  const [error, setError] = createSignal("");

  onMount(async () => {
    const root = await invoke<string | null>("get_root_directory");
    if (root) await loadRoot(root);
  });

  async function loadRoot(path: string) {
    setStatus("loading");
    setError("");
    try {
      await invoke<void>("set_root_directory", { path });
      const srcs = await invoke<Source[]>("list_sources", { path });
      setSources(srcs);
      setView("root");
      getCurrentWindow().setTitle("Ace Manga Reader");
      setStatus("idle");
    } catch (e) {
      setError(String(e));
      setStatus("error");
    }
  }

  async function openSource(source: Source, forceRefresh = false) {
    setCurrentSource(source);
    setComics([]);
    setView("source");
    setStatus("loading");
    setError("");
    try {
      const result = await invoke<Comic[]>("scan_directory", {
        path: source.path,
        forceRefresh,
      });
      setComics(result);
      setStatus("idle");
      getCurrentWindow().setTitle(`Ace Manga Reader — ${source.name}`);
    } catch (e) {
      setError(String(e));
      setStatus("error");
    }
  }

  function goBack() {
    setView("root");
    setComics([]);
    setCurrentSource(null);
    getCurrentWindow().setTitle("Ace Manga Reader");
  }

  return (
    <main class="flex flex-col h-screen overflow-hidden bg-zinc-950 text-zinc-100">

      {/* Root view */}
      <Show when={view() === "root"}>
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
      </Show>

      {/* Source view */}
      <Show when={view() === "source"}>
        <div class="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 shrink-0">
          <Button variant="ghost" onClick={goBack}>
            <ArrowLeft size={14} />
            Back
          </Button>
          <span class="flex-1 text-sm font-semibold text-zinc-100 truncate">
            {currentSource()?.name}
          </span>
          <Button variant="ghost" iconOnly onClick={() => { const s = currentSource(); if (s) openSource(s, true); }} title="Re-scan folder">
            <RefreshCw size={14} />
          </Button>
        </div>
        <Show when={status() === "loading"}>
          <p class="px-6 py-4 text-sm text-zinc-500">Scanning...</p>
        </Show>
        <Show when={status() === "error"}>
          <p class="px-6 py-4 text-sm text-red-400">{error()}</p>
        </Show>
        <Show when={status() === "idle" && comics().length === 0}>
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
        <Show when={comics().length > 0}>
          <ComicGrid comics={comics()} />
        </Show>
      </Show>

    </main>
  );
}

export default App;
