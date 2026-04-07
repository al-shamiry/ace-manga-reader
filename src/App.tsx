import { Show, JSX } from "solid-js";
import type { RouteSectionProps } from "@solidjs/router";
import { useLocation } from "@solidjs/router";
import { LibraryProvider } from "./context/LibraryContext";
import { ViewLoadingProvider, useViewLoading } from "./context/ViewLoadingContext";
import { SideNav } from "./components/SideNav";
import { TitleBar } from "./components/TitleBar";
import { LoadingOverlay } from "./components/LoadingOverlay";
import "./styles/global.css";

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
    <main class="relative flex flex-col flex-1 min-w-0 overflow-hidden">
      <div
        class="flex flex-col flex-1 min-w-0 overflow-hidden"
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
    <LibraryProvider>
      <ViewLoadingProvider>
        <div class="flex flex-col h-screen overflow-hidden bg-background text-foreground">
          <TitleBar />
          <div class="flex flex-1 min-h-0 overflow-hidden">
            <Show when={!isReader()}>
              <SideNav />
            </Show>
            <MainArea>{props.children}</MainArea>
          </div>
        </div>
      </ViewLoadingProvider>
    </LibraryProvider>
  );
}

export default App;
