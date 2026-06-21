import "./styles/global.css";

import { JSX, Show } from "solid-js";
import type { RouteSectionProps } from "@solidjs/router";
import { useLocation } from "@solidjs/router";

import { LoadingOverlay } from "./components/LoadingOverlay";
import { SideNav } from "./components/SideNav";
import { TitleBar } from "./components/TitleBar";
import { LibraryProvider } from "./context/LibraryContext";
import { SourcesProvider } from "./context/SourcesContext";
import {
  useViewLoading,
  ViewLoadingProvider,
} from "./context/ViewLoadingContext";

/**
 * Main content area. Children stay mounted but are hidden via
 * `visibility: hidden` while a view is busy — the overlay alone is
 * insufficient because the appearance delay leaves a 0–150ms window
 * where the overlay isn't painted but the view is, briefly exposing
 * default/empty signal state. Hiding content covers that window
 * regardless of whether the spinner ever appears.
 *
 * `visibility: hidden` (vs `display: none`) preserves layout box so
 * dimension-dependent measurements still work, and (vs `opacity: 0`)
 * blocks pointer events and removes elements from the accessibility
 * tree.
 */
function MainArea(props: { children: JSX.Element }) {
  const view = useViewLoading();
  return (
    <main class="relative flex min-w-0 flex-1 flex-col overflow-hidden">
      <div
        class="flex min-w-0 flex-1 flex-col overflow-hidden"
        style={{ visibility: view.isBusy() ? "hidden" : "visible" }}
      >
        {props.children}
      </div>
      <LoadingOverlay />
    </main>
  );
}

function App(props: RouteSectionProps) {
  const location = useLocation();
  const isReader = () => location.pathname.startsWith("/reader/");

  return (
    <SourcesProvider>
      <LibraryProvider>
        <ViewLoadingProvider>
          <div class="flex h-screen flex-col overflow-hidden bg-background text-foreground">
            <TitleBar />
            <div class="flex min-h-0 flex-1 overflow-hidden">
              <Show when={!isReader()}>
                <SideNav />
              </Show>
              <MainArea>{props.children}</MainArea>
            </div>
          </div>
        </ViewLoadingProvider>
      </LibraryProvider>
    </SourcesProvider>
  );
}

export default App;
