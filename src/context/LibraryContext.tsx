import { createContext, createSignal, onMount, useContext, JSX } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { Source, Category, LibraryEntry } from "../types";

type Status = "idle" | "loading" | "error";
export type ScanStatus = "scanning" | "done" | "error";

interface LibraryContextValue {
  sources: () => Source[];
  status: () => Status;
  error: () => string;
  loadRoot: (path: string) => Promise<void>;
  addSource: (path: string, name?: string) => Promise<void>;
  removeSource: (sourceId: string) => Promise<void>;
  setSourceHidden: (sourceId: string, hidden: boolean) => Promise<void>;
  refreshSources: () => Promise<void>;
  getSource: (id: string) => Source | undefined;
  scanStatus: () => Record<string, ScanStatus>;
  scanSource: (sourceId: string) => void;
  scanAllSources: () => void;
  categories: () => Category[];
  libraryEntries: () => LibraryEntry[];
  isInLibrary: (mangaId: string) => boolean;
  refreshCategories: () => Promise<void>;
  refreshLibrary: () => Promise<void>;
  /** Resolves once the provider's initial onMount load (sources,
   *  categories, library entries) has finished. Views that depend on this
   *  data should `await initialLoad()` before calling `view.ready()`. */
  initialLoad: () => Promise<void>;
}

const LibraryContext = createContext<LibraryContextValue>();

export function LibraryProvider(props: { children: JSX.Element }) {
  const [sources, setSources] = createSignal<Source[]>([]);
  const [status, setStatus] = createSignal<Status>("idle");
  const [error, setError] = createSignal("");
  const [categories, setCategories] = createSignal<Category[]>([]);
  const [libraryEntries, setLibraryEntries] = createSignal<LibraryEntry[]>([]);
  const [scanStatus, setScanStatus] = createSignal<Record<string, ScanStatus>>({});

  // Promise consumers can await — resolves when the initial sources +
  // categories + library load completes. Held in a closure so multiple
  // awaiters share the same resolution rather than each kicking off
  // duplicate work.
  let resolveInitial!: () => void;
  const initialLoadPromise = new Promise<void>((resolve) => {
    resolveInitial = resolve;
  });

  onMount(async () => {
    try {
      await refreshSources();
      await refreshCategories();
      await refreshLibrary();
    } finally {
      resolveInitial();
    }
  });

  async function refreshSources() {
    const srcs = await invoke<Source[]>("list_sources", { includeHidden: true });
    setSources(srcs);
  }

  async function loadRoot(path: string) {
    setStatus("loading");
    setError("");
    try {
      await invoke<void>("set_root_directory", { path });
      await refreshSources();
      setStatus("idle");
    } catch (e) {
      setError(String(e));
      setStatus("error");
    }
  }

  async function addSource(path: string, name?: string) {
    await invoke<Source>("add_source", { path, name: name ?? null });
    await refreshSources();
  }

  async function removeSource(sourceId: string) {
    await invoke("remove_source", { sourceId });
    await refreshSources();
    await refreshLibrary();
  }

  function setScanStatusFor(sourceId: string, status: ScanStatus | undefined) {
    setScanStatus((prev) => {
      const next = { ...prev };
      if (status === undefined) delete next[sourceId];
      else next[sourceId] = status;
      return next;
    });
  }

  function scanSource(sourceId: string) {
    const source = sources().find((s) => s.id === sourceId);
    if (!source) return;
    if (scanStatus()[sourceId] === "scanning") return;

    setScanStatusFor(sourceId, "scanning");

    invoke("scan_directory", { path: source.path, forceRefresh: true })
      .then(() => {
        setScanStatusFor(sourceId, "done");
        refreshSources();
        setTimeout(() => setScanStatusFor(sourceId, undefined), 2000);
      })
      .catch((e) => {
        console.error(`Re-scan failed for ${source.name}:`, e);
        setScanStatusFor(sourceId, "error");
        setTimeout(() => setScanStatusFor(sourceId, undefined), 3000);
      });
  }

  function scanAllSources() {
    for (const source of sources()) {
      if (!source.hidden) scanSource(source.id);
    }
  }

  async function setSourceHidden(sourceId: string, hidden: boolean) {
    await invoke("set_source_hidden", { sourceId, hidden });
    await refreshSources();
    await refreshLibrary();
  }

  function getSource(id: string) {
    return sources().find((s) => s.id === id);
  }

  function isInLibrary(mangaId: string) {
    return libraryEntries().some((e) => e.manga_id === mangaId);
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
      sources, status, error, loadRoot, addSource, removeSource, setSourceHidden, refreshSources, getSource,
      scanStatus, scanSource, scanAllSources,
      categories, libraryEntries, isInLibrary, refreshCategories, refreshLibrary,
      initialLoad: () => initialLoadPromise,
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
