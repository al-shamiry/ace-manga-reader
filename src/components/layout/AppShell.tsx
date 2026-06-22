import { JSX, Show } from "solid-js";
import { useLocation } from "@solidjs/router";

import { MainArea } from "./MainArea";
import { SideNav } from "./SideNav";
import { TitleBar } from "./TitleBar";

export type AppShellProps = {
  children: JSX.Element;
};

/**
 * Top-level chrome: title bar + (conditional) side nav + main area.
 * The side nav is hidden on the reader route so the reading surface
 * fills the window.
 */
export function AppShell(props: AppShellProps) {
  const location = useLocation();
  const isReader = () => location.pathname.startsWith("/reader/");

  return (
    <div class="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <TitleBar />
      <div class="flex min-h-0 flex-1 overflow-hidden">
        <Show when={!isReader()}>
          <SideNav />
        </Show>
        <MainArea>{props.children}</MainArea>
      </div>
    </div>
  );
}
