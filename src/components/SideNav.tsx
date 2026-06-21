import { createSignal, For } from "solid-js";
import { useLocation, useNavigate } from "@solidjs/router";

import {
  Clock,
  FolderOpen,
  Library,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
} from "lucide-solid";

const navItems = [
  { path: "/", icon: Library, label: "Library" },
  { path: "/history", icon: Clock, label: "History" },
  { path: "/sources", icon: FolderOpen, label: "Sources" },
  { path: "/settings", icon: Settings, label: "Settings" },
] as const;

export function SideNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [expanded, setExpanded] = createSignal(false);

  const ORIGIN_PATH = {
    library: "/",
    sources: "/sources",
    history: "/history",
  } as const;

  function isActive(path: string) {
    if (location.pathname.startsWith("/manga/")) {
      const from = (
        location.state as { from?: keyof typeof ORIGIN_PATH } | undefined
      )?.from;
      return ORIGIN_PATH[from ?? "library"] === path;
    }
    if (path === "/") {
      return location.pathname === "/";
    }
    if (path === "/sources") {
      return (
        location.pathname === "/sources" ||
        location.pathname.startsWith("/source/")
      );
    }
    return location.pathname.startsWith(path);
  }

  return (
    <nav
      class="side-nav flex h-full shrink-0 flex-col border-r border-ink-800 bg-ink-900 select-none"
      classList={{ expanded: expanded() }}
    >
      {/* Toggle button */}
      <button
        class="flex h-11 cursor-pointer items-center justify-center text-ink-500 transition-colors hover:bg-ink-800 hover:text-ink-300"
        onClick={() => setExpanded(!expanded())}
        title={expanded() ? "Collapse sidebar" : "Expand sidebar"}
      >
        {expanded() ? (
          <PanelLeftClose size={18} />
        ) : (
          <PanelLeftOpen size={18} />
        )}
      </button>

      {/* Nav items */}
      <div class="mt-1 flex flex-col gap-1 px-2">
        <For each={navItems}>
          {(item) => (
            <button
              class="side-nav-item flex cursor-pointer items-center gap-3 rounded-md transition-colors"
              classList={{
                "bg-ink-800 text-ink-100": isActive(item.path),
                "text-ink-500 hover:bg-ink-800/60 hover:text-ink-300":
                  !isActive(item.path),
              }}
              onClick={() => navigate(item.path)}
              title={item.label}
            >
              <div class="side-nav-icon flex shrink-0 items-center justify-center">
                <item.icon size={18} />
              </div>
              <span class="side-nav-label overflow-hidden text-sm font-medium whitespace-nowrap">
                {item.label}
              </span>
            </button>
          )}
        </For>
      </div>
    </nav>
  );
}
