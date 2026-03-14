import { createSignal, Show } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { DirectoryPicker } from "./components/DirectoryPicker";
import { ComicGrid } from "./components/ComicGrid";
import type { Comic } from "./types";
import "./App.css";

type Status = "idle" | "loading" | "error";

function App() {
  const [comics, setComics] = createSignal<Comic[]>([]);
  const [status, setStatus] = createSignal<Status>("idle");
  const [error, setError] = createSignal("");
  const [currentDir, setCurrentDir] = createSignal("");

  async function loadDirectory(path: string) {
    setStatus("loading");
    setError("");
    setCurrentDir(path);

    try {
      const result = await invoke<Comic[]>("scan_directory", { path });
      setComics(result);
      setStatus("idle");
    } catch (e) {
      setError(String(e));
      setStatus("error");
    }
  }

  return (
    <main class="app">
      <DirectoryPicker onSelect={loadDirectory} />

      <Show when={status() === "loading"}>
        <p class="status">Scanning...</p>
      </Show>

      <Show when={status() === "error"}>
        <p class="status error">{error()}</p>
      </Show>

      <Show when={status() === "idle" && currentDir() && comics().length === 0}>
        <p class="status">No comics found in this folder.</p>
      </Show>

      <Show when={comics().length > 0}>
        <ComicGrid comics={comics()} />
      </Show>
    </main>
  );
}

export default App;
