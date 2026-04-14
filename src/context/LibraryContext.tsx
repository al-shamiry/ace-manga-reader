import { createContext, createEffect, createSignal, on, onMount, useContext, JSX } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { useSources } from "./SourcesContext";
import type { Category, LibraryEntry } from "../types";

interface LibraryContextValue {
  categories: () => Category[];
  libraryEntries: () => LibraryEntry[];
  isInLibrary: (mangaId: string) => boolean;
  refreshCategories: () => Promise<void>;
  refreshLibrary: () => Promise<void>;
  /** Resolves once sources + categories + library entries are loaded. */
  initialLoad: () => Promise<void>;
}

const LibraryContext = createContext<LibraryContextValue>();

export function LibraryProvider(props: { children: JSX.Element }) {
  const { initialLoad: sourcesInitialLoad, sourceMutationCount } = useSources();
  const [categories, setCategories] = createSignal<Category[]>([]);
  const [libraryEntries, setLibraryEntries] = createSignal<LibraryEntry[]>([]);

  let resolveInitial!: () => void;
  const initialLoadPromise = new Promise<void>((resolve) => {
    resolveInitial = resolve;
  });

  onMount(async () => {
    try {
      await sourcesInitialLoad();
      await refreshCategories();
      await refreshLibrary();
    } finally {
      resolveInitial();
    }
  });

  createEffect(on(sourceMutationCount, () => {
    void refreshLibrary();
  }, { defer: true }));

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
      categories,
      libraryEntries,
      isInLibrary,
      refreshCategories,
      refreshLibrary,
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
