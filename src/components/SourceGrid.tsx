import { For } from "solid-js";
import { SourceCard } from "./SourceCard";
import type { Source } from "../types";

interface Props {
  sources: Source[];
  onSelect: (source: Source) => void;
}

export function SourceGrid(props: Props) {
  return (
    <div class="source-grid">
      <For each={props.sources}>
        {(source) => (
          <SourceCard source={source} onClick={() => props.onSelect(source)} />
        )}
      </For>
    </div>
  );
}
