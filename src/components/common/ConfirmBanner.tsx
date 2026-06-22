import { JSX } from "solid-js";

// A compact inline confirmation strip — a full-width banner that slots between
// a toolbar and the content it guards, for destructive bulk actions where a
// modal dialog would be too heavy. The consumer owns visibility (wrap in
// <Show>) and supplies the prompt copy as children.

export type ConfirmBannerProps = {
  /** The prompt. Keep it to one calm sentence stating the consequence. */
  children: JSX.Element;
  /** Confirm button label. Defaults to "Confirm". */
  confirmLabel?: string;
  /** Cancel button label. Defaults to "Cancel". */
  cancelLabel?: string;
  /** Visual weight. `danger` (default) tints the strip red for destructive ops. */
  tone?: "danger" | "neutral";
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmBanner(props: ConfirmBannerProps) {
  const danger = () => (props.tone ?? "danger") === "danger";
  return (
    <div
      class="border-b px-4 py-2"
      classList={{
        "border-red-900/30 bg-red-950/20": danger(),
        "border-ink-800/60 bg-ink-900/40": !danger(),
      }}
    >
      <div class="mx-auto flex max-w-3xl items-start justify-between gap-3">
        <p
          class="text-xs leading-relaxed"
          classList={{
            "text-red-300/85": danger(),
            "text-ink-300": !danger(),
          }}
        >
          {props.children}
        </p>
        <div class="flex shrink-0 items-center gap-2">
          <button
            class="h-7 cursor-pointer rounded-md px-2.5 text-xs font-medium text-ink-300 transition-colors hover:bg-ink-800 hover:text-ink-100"
            onClick={() => props.onCancel()}
          >
            {props.cancelLabel ?? "Cancel"}
          </button>
          <button
            class="h-7 cursor-pointer rounded-md px-2.5 text-xs font-medium transition-colors"
            classList={{
              "text-red-300 hover:bg-red-950/40 hover:text-red-200": danger(),
              "text-jade-300 hover:bg-jade-950/40 hover:text-jade-200":
                !danger(),
            }}
            onClick={() => props.onConfirm()}
          >
            {props.confirmLabel ?? "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
