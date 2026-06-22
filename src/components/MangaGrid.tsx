import { For } from "solid-js";

import type { DisplayMode, Manga, NavOrigin } from "~/types";

import { MangaCard } from "./MangaCard";

interface Props {
  mangas: Manga[];
  showLibraryBadge?: boolean;
  displayMode?: DisplayMode;
  cardSize?: number;
  showProgressBadge?: boolean;
  onContinue?: (manga: Manga) => void;
  selectionMode?: boolean;
  isSelected?: (manga: Manga) => boolean;
  onToggleSelect?: (manga: Manga) => void;
  from?: NavOrigin;
}

const GRID_CLASS: Record<DisplayMode, string> = {
  comfortable: "manga-grid",
  compact: "manga-grid-compact",
  "cover-only": "manga-grid-cover",
  list: "manga-list",
};

// Card size 1–15 → cover width in rem, snapped to 0.25rem (4px) increments
// like Tailwind's spacing scale. Geometric (~15% per step) anchored so size 8
// = 18rem (288px)
function coverWidthRem(size: number): string {
  const clamped = Math.max(1, Math.min(15, size));
  const px = 288 * Math.pow(1.15, clamped - 8);
  const units = Math.round(px / 4); // snap to 4px (0.25rem) steps
  return `${units * 0.25}rem`;
}

export function MangaGrid(props: Props) {
  const mode = () => props.displayMode ?? "comfortable";
  const style = () => ({ "--cover-w": coverWidthRem(props.cardSize ?? 8) });
  return (
    <div class={GRID_CLASS[mode()]} style={style()}>
      <For each={props.mangas}>
        {(manga) => (
          <MangaCard
            manga={manga}
            showLibraryBadge={props.showLibraryBadge}
            displayMode={mode()}
            showProgressBadge={props.showProgressBadge}
            onContinue={
              props.onContinue ? () => props.onContinue!(manga) : undefined
            }
            selectionMode={props.selectionMode}
            selected={props.isSelected?.(manga)}
            onToggleSelect={
              props.onToggleSelect
                ? () => props.onToggleSelect!(manga)
                : undefined
            }
            from={props.from}
          />
        )}
      </For>
    </div>
  );
}
