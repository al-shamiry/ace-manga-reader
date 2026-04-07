import { createSignal, Show, Switch, Match } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { convertFileSrc } from "@tauri-apps/api/core";
import { Bookmark, Play } from "lucide-solid";
import { useLibrary } from "../context/LibraryContext";
import { Button } from "./ui/button";
import type { DisplayMode, Manga } from "../types";

interface Props {
  manga: Manga;
  showLibraryBadge?: boolean;
  displayMode?: DisplayMode;
  unreadCount?: number;
  onContinue?: () => void;
}

export function MangaCard(props: Props) {
  const navigate = useNavigate();
  const { isInLibrary } = useLibrary();
  const [imgError, setImgError] = createSignal(false);
  const coverSrc = () => convertFileSrc(props.manga.cover_path);
  const mode = () => props.displayMode ?? "comfortable";
  const chapterText = () =>
    `${props.manga.chapter_count} ${props.manga.chapter_count === 1 ? "chapter" : "chapters"}`;

  function goToManga() {
    navigate("/manga/" + props.manga.id, { state: props.manga });
  }

  function CoverImage(p: { class?: string }) {
    return imgError() ? (
      <div class={`flex items-center justify-center text-ink-600 text-xs bg-ink-800 ${p.class ?? ""}`}>
        No Cover
      </div>
    ) : (
      <img
        src={coverSrc()}
        alt={props.manga.title}
        onError={() => setImgError(true)}
        class={`object-cover block ${p.class ?? ""}`}
      />
    );
  }

  function LibraryBadge() {
    return (
      <Show when={props.showLibraryBadge && isInLibrary(props.manga.id)}>
        <div class="absolute inset-0 bg-black/70" />
        <div class="absolute top-1.5 right-1.5 bg-jade-600 rounded-full p-1 shadow-md">
          <Bookmark size={12} fill="currentColor" class="text-white" />
        </div>
      </Show>
    );
  }

  function UnreadBadge() {
    return (
      <Show when={(props.unreadCount ?? 0) > 0}>
        <div class="absolute top-1.5 left-1.5 bg-jade-600 text-white text-[0.65rem] font-semibold leading-none px-1.5 py-1 rounded-md shadow-md min-w-5 text-center">
          {props.unreadCount}
        </div>
      </Show>
    );
  }

  function ContinueButton() {
    return (
      <Show when={props.onContinue}>
        <Button
          variant="primary"
          iconOnly
          class="absolute bottom-1.5 right-1.5 shadow-md"
          title="Continue reading"
          onClick={(e: MouseEvent) => {
            e.stopPropagation();
            props.onContinue?.();
          }}
        >
          <Play size={14} fill="currentColor" />
        </Button>
      </Show>
    );
  }

  return (
    <Switch>
      {/* ── List mode ── */}
      <Match when={mode() === "list"}>
        <div
          class="relative flex items-center gap-3 px-3 py-2 bg-ink-900 rounded-lg cursor-pointer transition-colors hover:bg-ink-800"
          onClick={goToManga}
        >
          <div class="relative w-12 h-16 rounded overflow-hidden shrink-0 bg-ink-800">
            <CoverImage class="w-full h-full" />
            <LibraryBadge />
            <UnreadBadge />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-ink-100 truncate">{props.manga.title}</p>
            <p class="text-xs text-ink-500 mt-0.5">{chapterText()}</p>
          </div>
          <ContinueButton />
        </div>
      </Match>

      {/* ── Cover-only mode — same as compact without text ── */}
      <Match when={mode() === "cover-only"}>
        <div
          class="relative bg-ink-800 rounded-lg overflow-hidden cursor-pointer transition-all duration-150 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/50 will-change-transform"
          onClick={goToManga}
        >
          <CoverImage class="w-full h-full" />
          <LibraryBadge />
          <UnreadBadge />
          <ContinueButton />
        </div>
      </Match>

      {/* ── Compact mode — title overlaid on cover with gradient ── */}
      <Match when={mode() === "compact"}>
        <div
          class="relative bg-ink-800 rounded-lg overflow-hidden cursor-pointer transition-all duration-150 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/50 will-change-transform"
          onClick={goToManga}
        >
          <CoverImage class="w-full h-full" />
          <LibraryBadge />
          <UnreadBadge />
          <div class="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 to-transparent px-2 pb-1.5 pt-6">
            <p class="text-[0.75rem] font-medium text-white truncate">{props.manga.title}</p>
          </div>
          <ContinueButton />
        </div>
      </Match>

      {/* ── Comfortable mode (default) — title below cover, wraps ── */}
      <Match when={true}>
        <div
          class="flex flex-col bg-ink-900 rounded-lg overflow-hidden cursor-pointer transition-all duration-150 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/50 will-change-transform"
          onClick={goToManga}
        >
          <div class="relative bg-ink-800 overflow-hidden cover-h">
            <CoverImage class="w-full h-full" />
            <LibraryBadge />
            <UnreadBadge />
            <ContinueButton />
          </div>
          <div class="px-2 py-1.5 shrink-0">
            <p class="text-[0.8rem] font-medium text-ink-100 leading-tight line-clamp-2">{props.manga.title}</p>
          </div>
        </div>
      </Match>
    </Switch>
  );
}
