import { createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { convertFileSrc } from "@tauri-apps/api/core";
import type { Comic } from "../types";

interface Props {
  comic: Comic;
}

export function ComicCard(props: Props) {
  const navigate = useNavigate();
  const [imgError, setImgError] = createSignal(false);
  const coverSrc = () => convertFileSrc(props.comic.cover_path);

  return (
    <div
      class="flex flex-col bg-zinc-900 rounded-lg overflow-hidden cursor-pointer transition-all duration-150 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/50 will-change-transform"
      onClick={() => navigate("/manga/" + props.comic.id, { state: props.comic })}
    >
      <div class="relative flex-1 bg-zinc-800 overflow-hidden min-h-0">
        {imgError() ? (
          <div class="w-full h-full flex items-center justify-center text-zinc-600 text-xs">
            No Cover
          </div>
        ) : (
          <img
            src={coverSrc()}
            alt={props.comic.title}
            onError={() => setImgError(true)}
            class="w-full h-full object-cover block"
          />
        )}
      </div>
      <div class="px-2.5 py-2 shrink-0">
        <p class="text-[0.8rem] font-medium text-zinc-100 truncate">{props.comic.title}</p>
        <p class="text-[0.7rem] text-zinc-500 mt-0.5">{props.comic.chapter_count} {props.comic.chapter_count === 1 ? "chapter" : "chapters"}</p>
      </div>
    </div>
  );
}
