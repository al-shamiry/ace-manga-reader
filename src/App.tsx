import { createSignal, Show, onMount } from "solid-js";
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
    <main class="app">
      <Show when={view() === "root"}>
        <DirectoryPicker
          onSelect={loadRoot}
          onRefresh={() => {}}
          hasLibrary={sources().length > 0}
        />
        <Show when={status() === "loading"}>
          <p class="status">Loading...</p>
        </Show>
        <Show when={status() === "error"}>
          <p class="status error">{error()}</p>
        </Show>
        <Show when={status() === "idle" && sources().length === 0}>
          <p class="status">No sources found. Select a library folder above.</p>
        </Show>
        <Show when={sources().length > 0}>
          <SourceGrid sources={sources()} onSelect={openSource} />
        </Show>
      </Show>

      <Show when={view() === "source"}>
        <div class="toolbar">
          <button class="btn-back" onClick={goBack}>← Back</button>
          <span class="toolbar__title">{currentSource()?.name}</span>
          <button
            class="btn-refresh"
            onClick={() => { const s = currentSource(); if (s) openSource(s, true); }}
            title="Re-scan folder"
          >↻</button>
        </div>
        <Show when={status() === "loading"}>
          <p class="status">Scanning...</p>
        </Show>
        <Show when={status() === "error"}>
          <p class="status error">{error()}</p>
        </Show>
        <Show when={status() === "idle" && comics().length === 0}>
          <p class="status">No comics found in this source.</p>
        </Show>
        <Show when={comics().length > 0}>
          <ComicGrid comics={comics()} />
        </Show>
      </Show>
    </main>
  );
}

export default App;
