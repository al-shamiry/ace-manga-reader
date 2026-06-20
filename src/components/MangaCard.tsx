import { createSignal, Show, Switch, Match } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { convertFileSrc } from "@tauri-apps/api/core";
import { Bookmark, Check, Play } from "lucide-solid";
import { useLibrary } from "../context/LibraryContext";
import { Button } from "./ui/button";
import type { DisplayMode, Manga } from "../types";

interface Props {
  manga: Manga;
  showLibraryBadge?: boolean;
  displayMode?: DisplayMode;
  showProgressBadge?: boolean;
  onContinue?: () => void;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}

export function MangaCard(props: Props) {
  const navigate = useNavigate();
  const { isInLibrary } = useLibrary();
  const [imgError, setImgError] = createSignal(false);
  const coverSrc = () => convertFileSrc(props.manga.cover_path);
  const mode = () => props.displayMode ?? "comfortable";
  const chapterText = () =>
    `${props.manga.chapter_count} ${props.manga.chapter_count === 1 ? "chapter" : "chapters"}`;
  const selectable = () => !!props.selectionMode;
  function handleActivate() {
    if (selectable()) {
      props.onToggleSelect?.();
      return;
    }
    navigate("/manga/" + props.manga.id, { state: props.manga });
  }

  // Selection affordance overlaid on the cover while selecting: an inset
  // jade ring (drawn above the image so it isn't painted over) plus a square
  // check indicator. The mark lives top-left, clearing the library badge
  // (top-right) and continue button (bottom-right).
  function SelectionMark(p: { class?: string }) {
    return (
      <Show when={selectable()}>
        <div
          class={`absolute z-20 flex h-5 w-5 items-center justify-center rounded-md border-2 shadow-md transition-colors ${
            props.selected
              ? "border-jade-500 bg-jade-500 text-ink-950"
              : "border-white/80 bg-black/40 text-transparent"
          } ${p.class ?? ""}`}
        >
          <Check size={12} strokeWidth={3} />
        </div>
      </Show>
    );
  }

  // Jade ring drawn over the whole card when selected. Sits above all card
  // content (z-30) so the cover image never paints over it. `tint` adds a
  // faint jade wash over the card (skipped in list mode).
  function SelectionRing(p: { tint?: boolean }) {
    return (
      <Show when={selectable() && props.selected}>
        <div class="pointer-events-none absolute inset-0 z-30 rounded-[inherit] ring-2 ring-inset ring-jade-700">
          <Show when={p.tint}>
            <div class="absolute inset-0 rounded-[inherit] bg-jade-500/10" />
          </Show>
        </div>
      </Show>
    );
  }

  function CoverImage(p: { class?: string }) {
    return imgError() ? (
      <div
        class={`flex items-center justify-center text-ink-600 text-xs bg-ink-800 ${p.class ?? ""}`}
      >
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

  function ProgressBadge() {
    const read = () => props.manga.read_chapters ?? 0;
    const total = () => props.manga.chapter_count;
    return (
      <Show when={props.showProgressBadge && total() > 0 && !selectable()}>
        <div class="absolute top-1.5 left-1.5 flex items-stretch overflow-hidden rounded-sm text-2xs font-normal tabular-nums leading-none text-center text-white shadow-md">
          <Switch>
            <Match when={read() === 0}>
              <span class="px-1.5 py-1 bg-jade-600">new</span>
            </Match>
            <Match when={read() >= total()}>
              <span class="px-1.5 py-1 text-ink-300 bg-ink-800">done</span>
            </Match>
            <Match when={true}>
              <span
                class="py-1 pr-1.5 pl-1 -mr-2 bg-jade-600"
                style={{
                  "clip-path":
                    "polygon(0 0, 100% 0, calc(100% - 4px) 100%, 0 100%)",
                }}
              >
                {read()}
              </span>
              <span class="py-1 pr-1 pl-2.5 text-ink-300 bg-ink-800">
                {total()}
              </span>
            </Match>
          </Switch>
        </div>
      </Show>
    );
  }

  function ContinueButton() {
    return (
      <Show when={props.onContinue && !selectable()}>
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
          onClick={handleActivate}
        >
          <SelectionRing />
          <Show when={selectable()}>
            <div
              class={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors ${
                props.selected
                  ? "border-jade-500 bg-jade-500 text-ink-950"
                  : "border-ink-600 text-transparent"
              }`}
            >
              <Check size={12} strokeWidth={3} />
            </div>
          </Show>
          <div class="relative w-12 h-16 rounded overflow-hidden shrink-0 bg-ink-800">
            <CoverImage class="w-full h-full" />
            <LibraryBadge />
            <ProgressBadge />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-ink-100 truncate">
              {props.manga.title}
            </p>
            <p class="text-xs text-ink-500 mt-0.5">{chapterText()}</p>
          </div>
          <ContinueButton />
        </div>
      </Match>

      {/* ── Cover-only mode — same as compact without text ── */}
      <Match when={mode() === "cover-only"}>
        <div
          class="relative bg-ink-800 rounded-lg overflow-hidden cursor-pointer transition-all duration-150 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/50 will-change-transform"
          onClick={handleActivate}
        >
          <CoverImage class="w-full h-full" />
          <LibraryBadge />
          <ProgressBadge />
          <ContinueButton />
          <SelectionMark class="top-1.5 left-1.5" />
          <SelectionRing tint />
        </div>
      </Match>

      {/* ── Compact mode — title overlaid on cover with gradient ── */}
      <Match when={mode() === "compact"}>
        <div
          class="relative bg-ink-800 rounded-lg overflow-hidden cursor-pointer transition-all duration-150 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/50 will-change-transform"
          onClick={handleActivate}
        >
          <CoverImage class="w-full h-full" />
          <LibraryBadge />
          <ProgressBadge />
          <div class="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 to-transparent px-2 pb-1.5 pt-6">
            <p class="text-[0.75rem] font-medium text-white truncate">
              {props.manga.title}
            </p>
          </div>
          <ContinueButton />
          <SelectionMark class="top-1.5 left-1.5" />
          <SelectionRing tint />
        </div>
      </Match>

      {/* ── Comfortable mode (default) — title below cover, wraps ── */}
      <Match when={true}>
        <div
          class="relative flex flex-col bg-ink-900 rounded-lg overflow-hidden cursor-pointer transition-all duration-150 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/50 will-change-transform"
          onClick={handleActivate}
        >
          <div class="relative bg-ink-800 overflow-hidden cover-h">
            <CoverImage class="w-full h-full" />
            <LibraryBadge />
            <ProgressBadge />
            <ContinueButton />
            <SelectionMark class="top-1.5 left-1.5" />
          </div>
          <div class="px-2 py-1.5 shrink-0">
            <p class="text-[0.8rem] font-medium text-ink-100 leading-tight line-clamp-2">
              {props.manga.title}
            </p>
            <p class="text-[0.7rem] text-ink-500 mt-0.5">{chapterText()}</p>
          </div>
          <SelectionRing tint />
        </div>
      </Match>
    </Switch>
  );
}
