import { Show } from "solid-js";

type PageCounterProps = {
  pageIndex: number;
  total: number;
  jumping: boolean;
  jumpInput: string;
  onStartJump: () => void;
  onSubmitJump: (e: Event) => void;
  onJumpInput: (value: string) => void;
  onJumpKeyDown: (e: KeyboardEvent) => void;
  focusRef: (el: HTMLInputElement) => void;
};

/** The page indicator in the bottom nav: a button showing "N / total" that
 * swaps to a jump-to-page input when clicked. */
export function PageCounter(props: PageCounterProps) {
  return (
    <Show
      when={props.jumping}
      fallback={
        <button
          class="cursor-pointer rounded px-2 py-1 text-sm text-ink-400 tabular-nums transition-colors hover:bg-ink-800 hover:text-ink-100"
          onClick={() => props.onStartJump()}
        >
          {props.pageIndex + 1} / {props.total}
        </button>
      }
    >
      <form
        class="flex items-center gap-1.5"
        onSubmit={(e) => props.onSubmitJump(e)}
      >
        <input
          type="number"
          min={1}
          max={props.total}
          value={props.jumpInput}
          onInput={(e) => props.onJumpInput(e.currentTarget.value)}
          onKeyDown={(e) => props.onJumpKeyDown(e)}
          ref={props.focusRef}
          class="w-14 [appearance:textfield] rounded border border-ink-600 bg-ink-800 px-1.5 py-0.5 text-center text-sm text-ink-100 tabular-nums outline-none focus:border-jade-500 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span class="text-sm text-ink-500">/ {props.total}</span>
      </form>
    </Show>
  );
}
