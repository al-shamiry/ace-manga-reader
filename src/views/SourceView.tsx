import { Show, createSignal, onMount } from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import { ArrowLeft, RefreshCw, BookOpen } from "lucide-solid";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Button } from "../components/Button";
import { MangaGrid } from "../components/MangaGrid";
import { MangaGridSkeleton } from "../components/Skeleton";
import { useLibrary } from "../context/LibraryContext";
import type { Manga } from "../types";

type Status = "idle" | "loading" | "error";

export function SourceView() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getSource } = useLibrary();

  const source = () => getSource(params.id);

  const [mangas, setMangas] = createSignal<Manga[]>([]);
  const [status, setStatus] = createSignal<Status>("idle");
  const [error, setError] = createSignal("");

  onMount(() => {
    const s = source();
    if (s) loadMangas(s.path);
  });

  async function loadMangas(path: string, forceRefresh = false) {
    setStatus("loading");
    setError("");
    try {
      const result = await invoke<Manga[]>("scan_directory", { path, forceRefresh });
      setMangas(result);
      setStatus("idle");
      getCurrentWindow().setTitle(`Ace Manga Reader — ${source()?.name}`);
    } catch (e) {
      setError(String(e));
      setStatus("error");
    }
  }

  return (
    <>
      <div class="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <Button variant="ghost" onClick={() => navigate("/")}>
          <ArrowLeft size={14} />
          Library
        </Button>
        <span class="text-zinc-600 text-sm">/</span>
        <span class="flex-1 text-sm font-semibold text-zinc-100 truncate">
          {source()?.name}
        </span>
        <Button variant="ghost" iconOnly onClick={() => { const s = source(); if (s) loadMangas(s.path, true); }} title="Re-scan folder">
          <RefreshCw size={14} />
        </Button>
      </div>
      <Show when={status() === "loading"}>
        <MangaGridSkeleton />
      </Show>
      <Show when={status() === "error"}>
        <p class="px-6 py-4 text-sm text-red-400">{error()}</p>
      </Show>
      <Show when={status() === "idle" && mangas().length === 0}>
        <div class="flex flex-col items-center justify-center flex-1 gap-4 text-center px-8">
          <div class="p-5 bg-zinc-900 rounded-2xl text-zinc-600">
            <BookOpen size={48} stroke-width={1} />
          </div>
          <div>
            <p class="text-zinc-300 font-medium">No manga found</p>
            <p class="text-zinc-600 text-sm mt-1">This source doesn't contain any recognised manga</p>
          </div>
        </div>
      </Show>
      <Show when={mangas().length > 0 && status() !== "loading"}>
        <MangaGrid mangas={mangas()} />
      </Show>
    </>
  );
}
