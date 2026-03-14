import { createSignal } from "solid-js";
import { convertFileSrc } from "@tauri-apps/api/core";
import type { Comic } from "../types";

interface Props {
  comic: Comic;
}

export function ComicCard(props: Props) {
  const [imgError, setImgError] = createSignal(false);
  const coverSrc = () => convertFileSrc(props.comic.cover_path);

  return (
    <div class="comic-card">
      <div class="comic-card__cover">
        {imgError() ? (
          <div class="comic-card__no-cover">No Cover</div>
        ) : (
          <img
            src={coverSrc()}
            alt={props.comic.title}
            onError={() => setImgError(true)}
          />
        )}
        <span class="comic-card__badge">{props.comic.file_type.toUpperCase()}</span>
      </div>
      <div class="comic-card__info">
        <p class="comic-card__title">{props.comic.title}</p>
        <p class="comic-card__pages">{props.comic.page_count} pages</p>
      </div>
    </div>
  );
}
