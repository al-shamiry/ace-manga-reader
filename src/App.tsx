import { Show } from "solid-js";
import type { RouteSectionProps } from "@solidjs/router";
import { useLocation } from "@solidjs/router";
import { LibraryProvider } from "./context/LibraryContext";
import { SideNav } from "./components/SideNav";
import "./styles/global.css";

function App(props: RouteSectionProps) {
  const location = useLocation();
  const isReader = () => location.pathname.startsWith("/reader/");

  return (
    <LibraryProvider>
      <div class="flex h-screen overflow-hidden bg-zinc-950 text-zinc-100">
        <Show when={!isReader()}>
          <SideNav />
        </Show>
        <main class="flex flex-col flex-1 min-w-0 overflow-hidden">
          {props.children}
        </main>
      </div>
    </LibraryProvider>
  );
}

export default App;
