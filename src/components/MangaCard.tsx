import { createSignal, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { convertFileSrc } from "@tauri-apps/api/core";
import { Bookmark } from "lucide-solid";
import { useLibrary } from "../context/LibraryContext";
import type { Manga } from "../types";

interface Props {
  manga: Manga;
  showLibraryBadge?: boolean;
}

export function MangaCard(props: Props) {
  const navigate = useNavigate();
  const { isInLibrary } = useLibrary();
  const [imgError, setImgError] = createSignal(false);
  const coverSrc = () => convertFileSrc(props.manga.cover_path);

  return (
    <div
      class="flex flex-col bg-zinc-900 rounded-lg overflow-hidden cursor-pointer transition-all duration-150 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/50 will-change-transform"
      onClick={() => navigate("/manga/" + props.manga.id, { state: props.manga })}
    >
      <div class="relative flex-1 bg-zinc-800 overflow-hidden min-h-0">
        {imgError() ? (
          <div class="w-full h-full flex items-center justify-center text-zinc-600 text-xs">
            No Cover
          </div>
        ) : (
          <img
            src={coverSrc()}
            alt={props.manga.title}
            onError={() => setImgError(true)}
            class="w-full h-full object-cover block"
          />
        )}
        <Show when={props.showLibraryBadge && isInLibrary(props.manga.id)}>
          <div class="absolute inset-0 bg-black/70" />
          <div class="absolute top-1.5 right-1.5 bg-indigo-600 rounded-full p-1 shadow-md">
            <Bookmark size={12} fill="currentColor" class="text-white" />
          </div>
        </Show>
      </div>
      <div class="px-2.5 py-2 shrink-0">
        <p class="text-[0.8rem] font-medium text-zinc-100 truncate">{props.manga.title}</p>
        <p class="text-[0.7rem] text-zinc-500 mt-0.5">{props.manga.chapter_count} {props.manga.chapter_count === 1 ? "chapter" : "chapters"}</p>
      </div>
    </div>
  );
}
