import { Show } from "solid-js";

import {
  ChevronDown,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
} from "lucide-solid";

import { Button } from "~/components/ui/button";

import { PageCounter } from "./PageCounter";

type ChapterTransitionProps = {
  // First / last chapter jumps (visual order; labels resolved for RTL).
  isRtl: boolean;
  verticalChevrons: boolean;
  onFirstChapter: () => void;
  firstChapterDisabled: boolean;
  onLastChapter: () => void;
  lastChapterDisabled: boolean;
  // Prev / next (page within chapter, or webtoon scroll).
  onPrev: () => void;
  prevDisabled: boolean;
  onNext: () => void;
  nextDisabled: boolean;
  // Page counter / jump-to-page.
  pageIndex: number;
  total: number;
  jumping: boolean;
  jumpInput: string;
  onStartJump: () => void;
  onSubmitJump: (e: Event) => void;
  onJumpInput: (value: string) => void;
  onJumpKeyDown: (e: KeyboardEvent) => void;
  focusJumpInput: (el: HTMLInputElement) => void;
};

/** Bottom navigation bar: jump to the previous/next chapter, step pages (or
 * scroll in webtoon), and the page counter / jump-to-page control. */
export function ChapterTransition(props: ChapterTransitionProps) {
  return (
    <div class="flex shrink-0 items-center justify-center gap-4 border-t border-ink-800 bg-ink-900 px-4 py-2.5">
      <Button
        variant="ghost"
        iconOnly
        onClick={() => props.onFirstChapter()}
        disabled={props.firstChapterDisabled}
        title={props.isRtl ? "Next chapter" : "Previous chapter"}
      >
        <ChevronFirst size={16} />
      </Button>
      <Button
        variant="ghost"
        iconOnly
        onClick={() => props.onPrev()}
        disabled={props.prevDisabled}
      >
        <Show
          when={props.verticalChevrons}
          fallback={<ChevronLeft size={16} />}
        >
          <ChevronUp size={16} />
        </Show>
      </Button>
      <PageCounter
        pageIndex={props.pageIndex}
        total={props.total}
        jumping={props.jumping}
        jumpInput={props.jumpInput}
        onStartJump={props.onStartJump}
        onSubmitJump={props.onSubmitJump}
        onJumpInput={props.onJumpInput}
        onJumpKeyDown={props.onJumpKeyDown}
        focusRef={props.focusJumpInput}
      />
      <Button
        variant="ghost"
        iconOnly
        onClick={() => props.onNext()}
        disabled={props.nextDisabled}
      >
        <Show
          when={props.verticalChevrons}
          fallback={<ChevronRight size={16} />}
        >
          <ChevronDown size={16} />
        </Show>
      </Button>
      <Button
        variant="ghost"
        iconOnly
        onClick={() => props.onLastChapter()}
        disabled={props.lastChapterDisabled}
        title={props.isRtl ? "Previous chapter" : "Next chapter"}
      >
        <ChevronLast size={16} />
      </Button>
    </div>
  );
}
