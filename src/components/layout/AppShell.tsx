import { JSX, Show } from "solid-js";
import { useLocation } from "@solidjs/router";

import { cn } from "~/lib/cn";

import { useReaderChrome } from "~/context/ReaderChromeContext";

import { MainArea } from "./MainArea";
import { SideNav } from "./SideNav";
import { TitleBar } from "./TitleBar";

export type AppShellProps = {
  children: JSX.Element;
};

/**
 * Top-level chrome: title bar + (conditional) side nav + main area.
 * The side nav is hidden on the reader route so the reading surface
 * fills the window. The title bar follows the reader's hideable UI: in the
 * layout while shown, an overlay (off-screen unless peeking) while hidden.
 */
export function AppShell(props: AppShellProps) {
  const location = useLocation();
  const readerChrome = useReaderChrome();
  const isReader = () => location.pathname.startsWith("/reader/");
  const titleBarHidden = () => readerChrome.chrome()?.hidden() ?? false;
  const titleBarVisible = () => readerChrome.chrome()?.visible() ?? true;

  return (
    <div class="relative flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <div
        data-reader-bar
        class={cn(
          "z-30 shrink-0 transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none",
          titleBarHidden() ? "absolute inset-x-0 top-0" : "relative",
          !titleBarVisible() &&
            "pointer-events-none -translate-y-full opacity-0",
        )}
      >
        <TitleBar />
      </div>
      <div class="flex min-h-0 flex-1 overflow-hidden">
        <Show when={!isReader()}>
          <SideNav />
        </Show>
        <MainArea>{props.children}</MainArea>
      </div>
    </div>
  );
}
