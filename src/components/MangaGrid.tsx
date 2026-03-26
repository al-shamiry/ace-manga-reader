import { For } from "solid-js";
import { MangaCard } from "./MangaCard";
import type { Manga } from "../types";

interface Props {
  mangas: Manga[];
  showLibraryBadge?: boolean;
}

export function MangaGrid(props: Props) {
  return (
    <div class="manga-grid">
      <For each={props.mangas}>
        {(manga) => <MangaCard manga={manga} showLibraryBadge={props.showLibraryBadge} />}
      </For>
    </div>
  );
}
