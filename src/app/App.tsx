import "~/styles/global.css";

import type { RouteSectionProps } from "@solidjs/router";

import { AppShell } from "~/components/layout/AppShell";

import { Providers } from "./providers";

/** Composition root: global providers wrapping the app shell. */
function App(props: RouteSectionProps) {
  return (
    <Providers>
      <AppShell>{props.children}</AppShell>
    </Providers>
  );
}

export default App;
