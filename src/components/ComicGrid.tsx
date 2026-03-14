import { For } from "solid-js";
import { ComicCard } from "./ComicCard";
import type { Comic } from "../types";

interface Props {
  comics: Comic[];
}

export function ComicGrid(props: Props) {
  return (
    <div class="comic-grid">
      <For each={props.comics}>
        {(comic) => <ComicCard comic={comic} />}
      </For>
    </div>
  );
}
