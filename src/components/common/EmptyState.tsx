import { JSX, Show } from "solid-js";

// Single canonical empty-state primitive. All "nothing here" surfaces in the
// app share this layout: left-aligned, centered vertically in the available
// space, eyebrow → display title → calm body → optional CTA → optional extra.
// The structure mirrors the design context's "calm, content-forward" voice
// and the typography pairing (Newsreader display + Hanken sans body).

export type EmptyStateProps = {
  /** Small uppercase label above the title — context, not decoration. */
  eyebrow: string;
  /** Hero title in the display face. State the situation in one phrase. */
  title: string;
  /** Optional second sentence — teach the interface, don't restate the title. */
  description?: JSX.Element;
  /** Optional single CTA. Use sparingly — most empty states are informational. */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Tint the eyebrow with the brand accent. Reserved for first-run / welcome. */
  accent?: boolean;
  /** Extra content rendered below the action — e.g. an "expected layout" block. */
  children?: JSX.Element;
};

export function EmptyState(props: EmptyStateProps) {
  return (
    <div class="mx-auto flex h-full w-full max-w-xl flex-col items-start justify-center gap-5 px-10">
      <p
        class="text-xs font-medium tracking-[0.2em] uppercase"
        classList={{
          "text-jade-400": props.accent,
          "text-ink-600": !props.accent,
        }}
      >
        {props.eyebrow}
      </p>
      <h2 class="font-display text-display leading-tight text-ink-100">
        {props.title}
      </h2>
      <Show when={props.description}>
        <p class="max-w-md text-base leading-relaxed text-ink-400">
          {props.description}
        </p>
      </Show>
      <Show when={props.action}>
        {(action) => (
          <button
            onClick={action().onClick}
            class="mt-2 cursor-pointer rounded-md bg-jade-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-jade-950/40 transition-colors hover:bg-jade-500"
          >
            {action().label}
          </button>
        )}
      </Show>
      {props.children}
    </div>
  );
}
