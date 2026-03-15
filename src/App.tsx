import type { RouteSectionProps } from "@solidjs/router";
import { LibraryProvider } from "./context/LibraryContext";
import "./styles/global.css";

function App(props: RouteSectionProps) {
  return (
    <LibraryProvider>
      <main class="flex flex-col h-screen overflow-hidden bg-zinc-950 text-zinc-100">
        {props.children}
      </main>
    </LibraryProvider>
  );
}

export default App;
