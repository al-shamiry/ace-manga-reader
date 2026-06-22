import { For } from "solid-js";

import type { HistoryEntry } from "~/types";

import type { HistoryDayGroup } from "~/lib/history-groups";

import { HistoryRow } from "~/components/history/HistoryRow";

interface HistoryGroupProps {
  group: HistoryDayGroup;
  first: boolean;
  onResume: (e: HistoryEntry) => void;
  onDelete: (e: HistoryEntry) => void;
}

export function HistoryGroup(props: HistoryGroupProps) {
  return (
    <section class={props.first ? "mt-10" : "mt-12"}>
      <h2 class="mb-3 text-[0.7rem] font-medium tracking-[0.2em] text-ink-600 uppercase">
        {props.group.label}
      </h2>
      <For each={props.group.entries}>
        {(entry) => (
          <HistoryRow
            entry={entry}
            onResume={props.onResume}
            onDelete={props.onDelete}
          />
        )}
      </For>
    </section>
  );
}
