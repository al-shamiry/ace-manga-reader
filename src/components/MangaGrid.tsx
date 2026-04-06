import { For } from "solid-js";
import { MangaCard } from "./MangaCard";
import type { DisplayMode, Manga } from "../types";

interface Props {
  mangas: Manga[];
  showLibraryBadge?: boolean;
  displayMode?: DisplayMode;
  cardSize?: number;
}

const GRID_CLASS: Record<DisplayMode, string> = {
  comfortable: "manga-grid",
  compact: "manga-grid-compact",
  "cover-only": "manga-grid-cover",
  list: "manga-list",
};

// Card size 1–15 → cover width 112–280px (default size 7 = 280px).
function coverWidthPx(size: number): number {
  const clamped = Math.max(1, Math.min(15, size));
  return 112 + clamped * 24;
}

export function MangaGrid(props: Props) {
  const mode = () => props.displayMode ?? "comfortable";
  const style = () => ({ "--cover-w": `${coverWidthPx(props.cardSize ?? 7)}px` });
  return (
    <div class={GRID_CLASS[mode()]} style={style()}>
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
