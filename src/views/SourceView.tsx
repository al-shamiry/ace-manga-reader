import { Show, createSignal, onMount } from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import { ArrowLeft, RefreshCw } from "lucide-solid";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { EmptyState } from "../components/EmptyState";
import { MangaGrid } from "../components/MangaGrid";
import { MangaGridSkeleton } from "../components/Skeleton";
import {
  Toolbar,
  ToolbarButton,
  ToolbarInlineButton,
  ToolbarTitle,
} from "../components/ui/toolbar";
import { useLibrary } from "../context/LibraryContext";
import { useViewLoading } from "../context/ViewLoadingContext";
import type { Manga } from "../types";

type Status = "idle" | "loading" | "error";

export function SourceView() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getSource, initialLoad } = useLibrary();
  const view = useViewLoading();
  // Mark busy synchronously so the overlay paints on the first frame.
  const loadToken = view.busy();

  const source = () => getSource(params.id);

  const [mangas, setMangas] = createSignal<Manga[]>([]);
  const [status, setStatus] = createSignal<Status>("idle");
  const [error, setError] = createSignal("");

  onMount(async () => {
    // Wait for the provider to populate `sources` before resolving the
    // current source — otherwise direct-navigation (cold start) would see
    // `source()` undefined and the overlay would never dismiss.
    await initialLoad();
    const s = source();
    if (s) await loadMangas(s.path);
    view.ready(loadToken);
  });

  // The refresh button calls loadMangas directly without touching
  // view.busy(), so it stays on the in-place skeleton path — we don't
  // want a full-screen overlay for a button click. Only initial mount
  // (above) drives the overlay.
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
    <div class="flex flex-col flex-1 overflow-hidden">
      <Toolbar>
        <ToolbarInlineButton onClick={() => navigate("/sources")}>
          <ArrowLeft size={14} />
          Sources
        </ToolbarInlineButton>
        <ToolbarTitle class="flex-1">{source()?.name}</ToolbarTitle>
        <ToolbarButton
          onClick={() => {
            const s = source();
            if (s) loadMangas(s.path, true);
          }}
          title="Re-scan folder"
        >
          <RefreshCw size={16} />
        </ToolbarButton>
      </Toolbar>
      <div class="flex-1 overflow-y-auto">
        <Show when={status() === "loading"}>
          <MangaGridSkeleton />
        </Show>
        <Show when={status() === "error"}>
          <p class="px-6 py-4 text-sm text-red-400">{error()}</p>
        </Show>
        <Show when={status() === "idle" && mangas().length === 0}>
          <EmptyState
            eyebrow={source()?.name ?? "Source"}
            title="No manga in this source."
            description={
              <>
                Ace expects each manga to live in its own subfolder containing
                chapter folders or <span class="font-mono text-ink-300">.cbz</span> archives.
                Add some, or re-scan if you just dropped files in.
              </>
            }
          />
        </Show>
        <Show when={mangas().length > 0 && status() !== "loading"}>
          <MangaGrid mangas={mangas()} showLibraryBadge />
        </Show>
      </div>
    </div>
  );
}
