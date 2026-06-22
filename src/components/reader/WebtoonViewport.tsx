import type { JSX } from "solid-js";
import { Index } from "solid-js";

import { convertFileSrc } from "@tauri-apps/api/core";

type WebtoonViewportProps = {
  pages: string[];
  webtoonPadding: number;
  tapZoneStyle: JSX.CSSProperties;
  initRef: (el: HTMLDivElement) => void;
  onTapUp: () => void;
  onTapDown: () => void;
};

export function WebtoonViewport(props: WebtoonViewportProps) {
  return (
    <div class="relative flex-1">
      <div class="absolute inset-0 overflow-y-auto" ref={props.initRef}>
        {/* Tap zones — sticky inside scroll container to respect scrollbars */}
        <div
          class="pointer-events-none sticky top-0 z-10 flex flex-col"
          style={props.tapZoneStyle}
        >
          <div
            class="cursor-up pointer-events-auto h-1/3 w-full"
            onClick={() => props.onTapUp()}
          />
          <div class="h-1/3 w-full" />
          <div
            class="cursor-down pointer-events-auto h-1/3 w-full"
            onClick={() => props.onTapDown()}
          />
        </div>
        <div
          class="flex flex-col items-center"
          style={{
            "padding-left": `${props.webtoonPadding}%`,
            "padding-right": `${props.webtoonPadding}%`,
          }}
        >
          <Index each={props.pages}>
            {(page, idx) => (
              <img
                src={convertFileSrc(page())}
                alt={`Page ${idx + 1}`}
                data-page={idx}
                class="h-auto w-full select-none"
                draggable={false}
              />
            )}
          </Index>
        </div>
      </div>
    </div>
  );
}
