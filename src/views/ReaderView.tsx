import { createMemo, Show } from "solid-js";
import { useLocation, useNavigate } from "@solidjs/router";

import { ArrowLeft } from "lucide-solid";

import type { ReaderState } from "~/types";

import { createFullscreen } from "~/hooks/createFullscreen";
import { createReaderNavigation } from "~/hooks/createReaderNavigation";
import { createReaderSettings } from "~/hooks/createReaderSettings";

import { ChapterTransition } from "~/components/reader/ChapterTransition";
import { PagedViewport } from "~/components/reader/PagedViewport";
import { ReaderToolbar } from "~/components/reader/ReaderToolbar";
import { WebtoonViewport } from "~/components/reader/WebtoonViewport";
import { Button } from "~/components/ui/button";

export function ReaderView() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = createMemo(() => location.state as ReaderState | undefined);

  const settings = createReaderSettings({ mangaId: () => state()?.manga.id });
  const fullscreen = createFullscreen();
  const nav = createReaderNavigation({
    getState: state,
    navigate,
    settings,
    fullscreen,
  });

  function goBack() {
    fullscreen.exit();
    navigate(-1);
  }

  return (
    <Show
      when={state()}
      fallback={
        <div class="flex flex-1 flex-col items-center justify-center gap-4 text-ink-500">
          <p class="text-sm">
            No chapter data — navigate here from the chapter list.
          </p>
          <Button variant="ghost" onClick={goBack}>
            <ArrowLeft size={14} /> Back
          </Button>
        </div>
      }
    >
      {(s) => (
        <div class="flex flex-1 flex-col overflow-hidden bg-ink-950">
          <ReaderToolbar
            title={`${s().manga.title} — ${s().chapter.title}`}
            readingMode={settings.readingMode()}
            onCycleReadingMode={settings.cycleReadingMode}
            isPaged={settings.isPaged()}
            fitMode={settings.fitMode()}
            onCycleFitMode={settings.cycleFitMode}
            webtoonPadding={settings.webtoonPadding()}
            onSetPadding={nav.setWebtoonPaddingPreserving}
            isFullscreen={fullscreen.isFullscreen()}
            onToggleFullscreen={fullscreen.toggle}
            onBack={goBack}
          />

          <Show when={nav.loading()}>
            <div class="flex flex-1 items-center justify-center">
              <div class="text-sm text-ink-500">Loading pages…</div>
            </div>
          </Show>

          <Show when={nav.error()}>
            <div class="flex flex-1 items-center justify-center">
              <p class="text-sm text-red-400">{nav.error()}</p>
            </div>
          </Show>

          <Show when={!nav.loading() && !nav.error() && nav.pages().length > 0}>
            {/* Webtoon mode — continuous scroll */}
            <Show when={settings.readingMode() === "webtoon"}>
              <WebtoonViewport
                pages={nav.pages()}
                webtoonPadding={settings.webtoonPadding()}
                tapZoneStyle={nav.tapZoneStyle()}
                initRef={nav.initWebtoonRef}
                onTapUp={nav.tapScrollUp}
                onTapDown={nav.tapScrollDown}
              />
            </Show>

            {/* Paged modes — single image with tap zones */}
            <Show when={settings.isPaged()}>
              <PagedViewport
                pages={nav.pages()}
                pageIndex={nav.pageIndex()}
                fitMode={settings.fitMode()}
                anim={nav.anim()}
                onClearAnim={nav.clearAnim}
                isVertical={settings.isVertical()}
                onTapLeft={nav.tapLeft}
                onTapRight={nav.tapRight}
                onPrev={nav.prev}
                onNext={nav.next}
                setPageContainer={nav.setPageContainer}
              />
            </Show>
          </Show>

          <ChapterTransition
            isRtl={settings.isRtl()}
            verticalChevrons={settings.isVertical() || !settings.isPaged()}
            onFirstChapter={nav.goFirstChapter}
            firstChapterDisabled={nav.firstChapterDisabled()}
            onLastChapter={nav.goLastChapter}
            lastChapterDisabled={nav.lastChapterDisabled()}
            onPrev={nav.navPrev}
            prevDisabled={nav.navPrevDisabled()}
            onNext={nav.navNext}
            nextDisabled={nav.navNextDisabled()}
            pageIndex={nav.pageIndex()}
            total={nav.pages().length}
            jumping={nav.jumping()}
            jumpInput={nav.jumpInput()}
            onStartJump={nav.startJump}
            onSubmitJump={nav.submitJump}
            onJumpInput={nav.setJumpInput}
            onJumpKeyDown={nav.jumpKeyDown}
            focusJumpInput={nav.focusJumpInput}
          />
        </div>
      )}
    </Show>
  );
}
