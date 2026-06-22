import { Show } from "solid-js";

import { AlignCenter, ArrowLeft, Maximize2, Minimize2 } from "lucide-solid";

import type { FitMode, ReadingMode } from "~/types";

import {
  FIT_ICONS,
  FIT_LABELS,
  READING_ICONS,
  READING_LABELS,
} from "~/lib/reader-modes";

import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Slider,
  SliderFill,
  SliderThumb,
  SliderTrack,
} from "~/components/ui/slider";

type ReaderToolbarProps = {
  title: string;
  readingMode: ReadingMode;
  onCycleReadingMode: () => void;
  isPaged: boolean;
  fitMode: FitMode;
  onCycleFitMode: () => void;
  webtoonPadding: number;
  onSetPadding: (next: number) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onBack: () => void;
};

export function ReaderToolbar(props: ReaderToolbarProps) {
  return (
    <div class="flex shrink-0 items-center gap-2 border-b border-ink-800 bg-ink-900 px-4 py-2.5">
      <Button variant="ghost" onClick={() => props.onBack()}>
        <ArrowLeft size={14} />
        Back
      </Button>
      <span class="flex-1 truncate text-sm font-semibold text-ink-100">
        {props.title}
      </span>
      <Button
        variant="ghost"
        onClick={() => props.onCycleReadingMode()}
        title={READING_LABELS[props.readingMode]}
      >
        {(() => {
          const Icon = READING_ICONS[props.readingMode];
          return <Icon size={14} />;
        })()}
        <span class="text-xs">{READING_LABELS[props.readingMode]}</span>
      </Button>
      <Show when={props.isPaged}>
        <Button
          variant="ghost"
          onClick={() => props.onCycleFitMode()}
          title={FIT_LABELS[props.fitMode]}
        >
          {(() => {
            const Icon = FIT_ICONS[props.fitMode];
            return <Icon size={14} />;
          })()}
          <span class="text-xs">{FIT_LABELS[props.fitMode]}</span>
        </Button>
      </Show>
      <Show when={!props.isPaged}>
        <DropdownMenu>
          <DropdownMenuTrigger
            as={Button}
            variant="ghost"
            title="Side padding (Ctrl+scroll)"
          >
            <AlignCenter size={14} />
            <span class="text-xs">{props.webtoonPadding}%</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent class="w-52 p-3">
            <div class="mb-2 text-xs font-semibold text-ink-300">
              Side padding
            </div>
            <div class="flex items-center gap-2">
              <span class="shrink-0 text-[0.7rem] text-muted-foreground">
                0%
              </span>
              <Slider
                minValue={0}
                maxValue={40}
                step={1}
                value={[props.webtoonPadding]}
                onChange={(v) => props.onSetPadding(v[0])}
                class="flex-1"
              >
                <SliderTrack>
                  <SliderFill />
                  <SliderThumb />
                </SliderTrack>
              </Slider>
              <span class="shrink-0 text-[0.7rem] text-muted-foreground">
                40%
              </span>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </Show>
      <Button
        variant="ghost"
        iconOnly
        onClick={() => props.onToggleFullscreen()}
        title="Fullscreen (F11)"
      >
        {props.isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
      </Button>
    </div>
  );
}
