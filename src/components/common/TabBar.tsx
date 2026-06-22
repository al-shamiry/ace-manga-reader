import { createSignal, For, Show } from "solid-js";

import { Pencil, Trash2 } from "lucide-solid";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
} from "~/components/ui/dropdown-menu";
import {
  Tabs,
  TabsIndicator,
  TabsList,
  TabsTrigger,
} from "~/components/ui/tabs";

interface Tab {
  id: string;
  label: string;
  count?: number;
  deletable?: boolean;
}

interface Props {
  tabs: Tab[];
  activeTab: string;
  onSelect: (id: string) => void;
  onRenameStart?: (tab: Tab) => void;
  onDelete?: (tab: Tab) => void;
  renamingId?: string;
  renamingValue?: string;
  onRenameInput?: (value: string) => void;
  onRenameSubmit?: () => void;
  onRenameCancel?: () => void;
}

export type { Tab };

export function TabBar(props: Props) {
  // Single shared context-menu state. Tabs sit inside Kobalte Tabs (which uses
  // its own DomCollection); wrapping each TabsTrigger in a Menu provider would
  // re-route the trigger registration into the menu's collection and break tab
  // selection. Instead, render one menu as a sibling of TabsList and anchor it
  // to the cursor on right-click.
  const [menuOpen, setMenuOpen] = createSignal(false);
  const [menuTab, setMenuTab] = createSignal<Tab | null>(null);
  const [anchor, setAnchor] = createSignal({ x: 0, y: 0, width: 0, height: 0 });
  const [renameAnchor, setRenameAnchor] = createSignal({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  // Map of tab id → TabsTrigger DOM element, used to anchor the rename popover.
  const tabRefs = new Map<string, HTMLElement>();

  function openMenu(e: MouseEvent, tab: Tab) {
    e.preventDefault();
    setMenuTab(tab);
    setAnchor({ x: e.clientX, y: e.clientY, width: 0, height: 0 });
    setMenuOpen(true);
  }

  function startRename(tab: Tab) {
    const el = tabRefs.get(tab.id);
    if (el) {
      const r = el.getBoundingClientRect();
      setRenameAnchor({ x: r.left, y: r.bottom, width: r.width, height: 0 });
    }
    props.onRenameStart?.(tab);
  }

  return (
    <Tabs
      value={props.activeTab}
      onChange={(v) => props.onSelect(v)}
      activationMode="manual"
    >
      <TabsList>
        <For each={props.tabs}>
          {(tab) => (
            <TabsTrigger
              value={tab.id}
              ref={(el) => tabRefs.set(tab.id, el)}
              onContextMenu={(e: MouseEvent) => openMenu(e, tab)}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  class="rounded-full px-1.5 py-0.5 text-xs"
                  classList={{
                    "bg-ink-700 text-ink-300": props.activeTab === tab.id,
                    "bg-ink-800 text-ink-500": props.activeTab !== tab.id,
                  }}
                >
                  {tab.count}
                </span>
              )}
            </TabsTrigger>
          )}
        </For>
        <TabsIndicator />
      </TabsList>

      {/* Rename popover — anchored to the tab element, outside click cancels */}
      <DropdownMenu
        open={props.renamingId != null}
        onOpenChange={(open) => {
          if (!open) props.onRenameCancel?.();
        }}
        getAnchorRect={() => renameAnchor()}
      >
        <DropdownMenuPortal>
          <DropdownMenuContent class="min-w-0 p-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                props.onRenameSubmit?.();
              }}
            >
              <input
                ref={(el) =>
                  requestAnimationFrame(() => setTimeout(() => el.focus(), 50))
                }
                placeholder="Category name"
                class="h-7 w-40 rounded border border-jade-500 bg-ink-800 px-2 text-sm text-ink-100 outline-none placeholder:text-ink-600"
                value={props.renamingValue ?? ""}
                onInput={(e) => props.onRenameInput?.(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") props.onRenameCancel?.();
                }}
              />
            </form>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>

      {/* Context menu — anchored to cursor on right-click */}
      <DropdownMenu
        open={menuOpen()}
        onOpenChange={setMenuOpen}
        getAnchorRect={() => anchor()}
      >
        <DropdownMenuPortal>
          <DropdownMenuContent class="min-w-36 py-1">
            <DropdownMenuItem
              class="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-ink-300 outline-none data-highlighted:bg-ink-700 data-highlighted:text-ink-100"
              onSelect={() => {
                const t = menuTab();
                if (t) startRename(t);
              }}
            >
              <Pencil size={14} />
              Rename
            </DropdownMenuItem>
            <Show when={menuTab()?.deletable !== false}>
              <DropdownMenuItem
                class="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-red-400 outline-none data-highlighted:bg-ink-700"
                onSelect={() => {
                  const t = menuTab();
                  if (t) props.onDelete?.(t);
                }}
              >
                <Trash2 size={14} />
                Delete
              </DropdownMenuItem>
            </Show>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>
    </Tabs>
  );
}
