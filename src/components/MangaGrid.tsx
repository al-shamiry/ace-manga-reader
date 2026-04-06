import { For } from "solid-js";
import { MangaCard } from "./MangaCard";
import type { DisplayMode, Manga } from "../types";

interface Props {
  mangas: Manga[];
  showLibraryBadge?: boolean;
  displayMode?: DisplayMode;
}

const GRID_CLASS: Record<DisplayMode, string> = {
  comfortable: "manga-grid",
  compact: "manga-grid-compact",
  "cover-only": "manga-grid-cover",
  list: "manga-list",
};

export function MangaGrid(props: Props) {
  const mode = () => props.displayMode ?? "comfortable";
  return (
    <div class={GRID_CLASS[mode()]}>
      <For each={props.mangas}>
        {(manga) => (
          <MangaCard
            manga={manga}
            showLibraryBadge={props.showLibraryBadge}
            displayMode={mode()}
          />
        )}
      </For>
    </div>
  );
}
