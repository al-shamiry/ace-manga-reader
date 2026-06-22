import {
  createContext,
  createSignal,
  JSX,
  onMount,
  useContext,
} from "solid-js";

import * as api from "~/api";
import type { Source } from "~/types";

type Status = "idle" | "loading" | "error";
export type ScanStatus = "scanning" | "done" | "error";
export type ScanEntry = { status: ScanStatus; error?: string };

interface SourcesContextValue {
  sources: () => Source[];
  status: () => Status;
  error: () => string;
  loadRoot: (path: string) => Promise<void>;
  addSource: (path: string, name?: string) => Promise<void>;
  removeSource: (sourceId: string) => Promise<void>;
  relocateSource: (sourceId: string, newPath: string) => Promise<void>;
  setSourceHidden: (sourceId: string, hidden: boolean) => Promise<void>;
  refreshSources: () => Promise<void>;
  getSource: (id: string) => Source | undefined;
  scanStatus: () => Record<string, ScanEntry>;
  scanSource: (sourceId: string) => void;
  scanAllSources: () => void;
  /** Resolves once the provider's initial onMount source load has finished. */
  initialLoad: () => Promise<void>;
  /** Increments after source mutations that should trigger library refreshes. */
  sourceMutationCount: () => number;
}

const SourcesContext = createContext<SourcesContextValue>();

export function SourcesProvider(props: { children: JSX.Element }) {
  const [sources, setSources] = createSignal<Source[]>([]);
  const [status, setStatus] = createSignal<Status>("idle");
  const [error, setError] = createSignal("");
  const [scanStatus, setScanStatus] = createSignal<Record<string, ScanEntry>>(
    {},
  );
  const [sourceMutationCount, setSourceMutationCount] = createSignal(0);

  let resolveInitial!: () => void;
  const initialLoadPromise = new Promise<void>((resolve) => {
    resolveInitial = resolve;
  });

  onMount(async () => {
    try {
      setStatus("loading");
      await new Promise((resolve) => setTimeout(resolve, 60));
      await refreshSources();
      setStatus("idle");
    } catch (e) {
      setError(String(e));
      setStatus("error");
    } finally {
      resolveInitial();
    }
  });

  async function refreshSources() {
    const srcs = await api.sources.listSources(true);
    setSources(srcs);
  }

  async function loadRoot(path: string) {
    setStatus("loading");
    setError("");
    try {
      await api.settings.setRootDirectory(path);
      await refreshSources();
      setStatus("idle");
    } catch (e) {
      setError(String(e));
      setStatus("error");
    }
  }

  async function addSource(path: string, name?: string) {
    await api.sources.addSource(path, name ?? null);
    await refreshSources();
  }

  async function removeSource(sourceId: string) {
    await api.sources.removeSource(sourceId);
    await refreshSources();
    setSourceMutationCount((count) => count + 1);
  }

  async function relocateSource(sourceId: string, newPath: string) {
    await api.sources.relocateSource(sourceId, newPath);
    await refreshSources();
    setSourceMutationCount((count) => count + 1);
  }

  async function setSourceHidden(sourceId: string, hidden: boolean) {
    await api.sources.setSourceHidden(sourceId, hidden);
    await refreshSources();
    setSourceMutationCount((count) => count + 1);
  }

  function setScanStatusFor(sourceId: string, entry: ScanEntry | undefined) {
    setScanStatus((prev) => {
      const next = { ...prev };
      if (entry === undefined) delete next[sourceId];
      else next[sourceId] = entry;
      return next;
    });
  }

  function scanSource(sourceId: string) {
    const source = sources().find((s) => s.id === sourceId);
    if (!source) return;
    if (scanStatus()[sourceId]?.status === "scanning") return;
    if (source.path_missing) {
      setScanStatusFor(sourceId, {
        status: "error",
        error: "Source folder is missing",
      });
      setTimeout(() => setScanStatusFor(sourceId, undefined), 1500);
      return;
    }

    setScanStatusFor(sourceId, { status: "scanning" });

    api.sources
      .scanSource(source.path, true)
      .then(() => {
        setScanStatusFor(sourceId, { status: "done" });
        refreshSources();
        setTimeout(() => setScanStatusFor(sourceId, undefined), 2000);
      })
      .catch((e) => {
        console.error(`Re-scan failed for ${source.name}:`, e);
        setScanStatusFor(sourceId, { status: "error", error: String(e) });
        setTimeout(() => setScanStatusFor(sourceId, undefined), 3000);
      });
  }

  function scanAllSources() {
    for (const source of sources()) {
      if (!source.hidden) scanSource(source.id);
    }
  }

  function getSource(id: string) {
    return sources().find((s) => s.id === id);
  }

  return (
    <SourcesContext.Provider
      value={{
        sources,
        status,
        error,
        loadRoot,
        addSource,
        removeSource,
        relocateSource,
        setSourceHidden,
        refreshSources,
        getSource,
        scanStatus,
        scanSource,
        scanAllSources,
        initialLoad: () => initialLoadPromise,
        sourceMutationCount,
      }}
    >
      {props.children}
    </SourcesContext.Provider>
  );
}

export function useSources() {
  const ctx = useContext(SourcesContext);
  if (!ctx) throw new Error("useSources must be used within SourcesProvider");
  return ctx;
}
