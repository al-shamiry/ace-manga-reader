import { createSignal, Show, onMount } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { RootView } from "./views/RootView";
import { SourceView } from "./views/SourceView";
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
      <Show when={view() === "root"}>
        <RootView
          sources={sources()}
          status={status()}
          error={error()}
          onSelect={loadRoot}
          onSourceOpen={openSource}
        />
      </Show>
      <Show when={view() === "source" && currentSource() !== null}>
        <SourceView
          source={currentSource()!}
          comics={comics()}
          status={status()}
          error={error()}
          onBack={goBack}
          onRefresh={() => openSource(currentSource()!, true)}
        />
      </Show>
    </main>
  );
}

export default App;
