import { createContext, createSignal, onMount, useContext, JSX } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { Source, Category, LibraryEntry } from "../types";

type Status = "idle" | "loading" | "error";

interface LibraryContextValue {
  sources: () => Source[];
  status: () => Status;
  error: () => string;
  loadRoot: (path: string) => Promise<void>;
  getSource: (id: string) => Source | undefined;
  categories: () => Category[];
  libraryEntries: () => LibraryEntry[];
  refreshCategories: () => Promise<void>;
  refreshLibrary: () => Promise<void>;
}

const LibraryContext = createContext<LibraryContextValue>();

export function LibraryProvider(props: { children: JSX.Element }) {
  const [sources, setSources] = createSignal<Source[]>([]);
  const [status, setStatus] = createSignal<Status>("idle");
  const [error, setError] = createSignal("");
  const [categories, setCategories] = createSignal<Category[]>([]);
  const [libraryEntries, setLibraryEntries] = createSignal<LibraryEntry[]>([]);

  onMount(async () => {
    const root = await invoke<string | null>("get_root_directory");
    if (root) await loadRoot(root);
    await refreshCategories();
    await refreshLibrary();
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

  async function refreshCategories() {
    try {
      const cats = await invoke<Category[]>("get_categories");
      setCategories(cats);
    } catch (e) {
      console.error("Failed to load categories:", e);
    }
  }

  async function refreshLibrary() {
    try {
      const entries = await invoke<LibraryEntry[]>("get_library");
      setLibraryEntries(entries);
    } catch (e) {
      console.error("Failed to load library:", e);
    }
  }

  return (
    <LibraryContext.Provider value={{
      sources, status, error, loadRoot, getSource,
      categories, libraryEntries, refreshCategories, refreshLibrary,
    }}>
      {props.children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used within LibraryProvider");
  return ctx;
}
