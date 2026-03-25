import { createSignal } from "solid-js";
import { useLocation, useNavigate } from "@solidjs/router";
import { Library, Clock, FolderOpen, Settings, PanelLeftClose, PanelLeftOpen } from "lucide-solid";

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

  function isActive(path: string) {
    if (path === "/") {
      return location.pathname === "/" || location.pathname.startsWith("/source/") || location.pathname.startsWith("/manga/");
    }
    return location.pathname.startsWith(path);
  }

  return (
    <nav
      class="side-nav flex flex-col shrink-0 bg-zinc-900 border-r border-zinc-800 h-full select-none"
      classList={{ expanded: expanded() }}
    >
      {/* Toggle button */}
      <button
        class="flex items-center justify-center h-11 hover:bg-zinc-800 transition-colors cursor-pointer text-zinc-500 hover:text-zinc-300"
        onClick={() => setExpanded(!expanded())}
        title={expanded() ? "Collapse sidebar" : "Expand sidebar"}
      >
        {expanded() ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
      </button>

      {/* Nav items */}
      <div class="flex flex-col gap-1 px-2 mt-1">
        {navItems.map((item) => (
          <button
            class="side-nav-item flex items-center gap-3 rounded-md transition-colors cursor-pointer"
            classList={{
              "bg-zinc-800 text-zinc-100": isActive(item.path),
              "text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300": !isActive(item.path),
            }}
            onClick={() => navigate(item.path)}
            title={item.label}
          >
            <div class="side-nav-icon flex items-center justify-center shrink-0">
              <item.icon size={18} />
            </div>
            <span class="side-nav-label text-sm font-medium whitespace-nowrap overflow-hidden">
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}
