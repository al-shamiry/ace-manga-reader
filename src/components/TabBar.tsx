import { For, Show, createSignal } from "solid-js";
import { Pencil, Trash2 } from "lucide-solid";
import { Tabs, TabsList, TabsTrigger, TabsIndicator } from "./ui/tabs";
import {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
} from "./ui/dropdown-menu";

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

  function openMenu(e: MouseEvent, tab: Tab) {
    e.preventDefault();
    setMenuTab(tab);
    setAnchor({ x: e.clientX, y: e.clientY, width: 0, height: 0 });
    setMenuOpen(true);
  }

  return (
    <Tabs
      value={props.activeTab}
      onChange={(v) => props.onSelect(v)}
      activationMode="manual"
    >
      <TabsList>
        <For each={props.tabs}>
          {(tab) => {
            const isRenaming = () => props.renamingId === tab.id;
            return (
              <Show
                when={!isRenaming()}
                fallback={
                  <form
                    class="flex items-center pb-2.5 pt-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      props.onRenameSubmit?.();
                    }}
                  >
                    <input
                      autofocus
                      class="h-7 px-2 bg-ink-800 border border-jade-500 text-ink-100 rounded text-sm outline-none w-28"
                      value={props.renamingValue ?? ""}
                      onInput={(e) => props.onRenameInput?.(e.currentTarget.value)}
                      onBlur={() => props.onRenameSubmit?.()}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") props.onRenameCancel?.();
                      }}
                    />
                  </form>
                }
              >
                <TabsTrigger
                  value={tab.id}
                  onContextMenu={(e: MouseEvent) => openMenu(e, tab)}
                >
                  {tab.label}
                  {tab.count !== undefined && (
                    <span
                      class="text-xs px-1.5 py-0.5 rounded-full"
                      classList={{
                        "bg-ink-700 text-ink-300": props.activeTab === tab.id,
                        "bg-ink-800 text-ink-500": props.activeTab !== tab.id,
                      }}
                    >
                      {tab.count}
                    </span>
                  )}
                </TabsTrigger>
              </Show>
            );
          }}
        </For>
        <TabsIndicator />
      </TabsList>

      <DropdownMenu
        open={menuOpen()}
        onOpenChange={setMenuOpen}
        getAnchorRect={() => anchor()}
      >
        <DropdownMenuPortal>
          <DropdownMenuContent class="py-1 min-w-36">
            <DropdownMenuItem
              class="flex items-center gap-2 px-3 py-1.5 text-sm text-ink-300 cursor-pointer outline-none data-highlighted:bg-ink-700 data-highlighted:text-ink-100"
              onSelect={() => {
                const t = menuTab();
                if (t) props.onRenameStart?.(t);
              }}
            >
              <Pencil size={14} />
              Rename
            </DropdownMenuItem>
            <Show when={menuTab()?.deletable !== false}>
              <DropdownMenuItem
                class="flex items-center gap-2 px-3 py-1.5 text-sm text-red-400 cursor-pointer outline-none data-highlighted:bg-ink-700"
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
