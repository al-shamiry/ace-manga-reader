import { createContext, createSignal, onMount, useContext, JSX } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { Source } from "../types";

type Status = "idle" | "loading" | "error";

interface LibraryContextValue {
  sources: () => Source[];
  status: () => Status;
  error: () => string;
  loadRoot: (path: string) => Promise<void>;
  getSource: (id: string) => Source | undefined;
}

const LibraryContext = createContext<LibraryContextValue>();

export function LibraryProvider(props: { children: JSX.Element }) {
  const [sources, setSources] = createSignal<Source[]>([]);
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
      getCurrentWindow().setTitle("Ace Manga Reader");
      setStatus("idle");
    } catch (e) {
      setError(String(e));
      setStatus("error");
    }
  }

  function getSource(id: string) {
    return sources().find((s) => s.id === id);
  }

  return (
    <LibraryContext.Provider value={{ sources, status, error, loadRoot, getSource }}>
      {props.children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used within LibraryProvider");
  return ctx;
}
