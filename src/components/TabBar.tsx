import { For, Show } from "solid-js";
import { Pencil, Trash2 } from "lucide-solid";
import { Tabs, TabsList, TabsTrigger, TabsIndicator } from "./ui/tabs";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from "./ui/context-menu";

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
                      class="h-7 px-2 bg-zinc-800 border border-indigo-500 text-zinc-100 rounded text-sm outline-none w-28"
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
                <ContextMenu>
                  <ContextMenuTrigger as={TabsTrigger} value={tab.id}>
                    {tab.label}
                    {tab.count !== undefined && (
                      <span
                        class="text-xs px-1.5 py-0.5 rounded-full"
                        classList={{
                          "bg-zinc-700 text-zinc-300": props.activeTab === tab.id,
                          "bg-zinc-800 text-zinc-500": props.activeTab !== tab.id,
                        }}
                      >
                        {tab.count}
                      </span>
                    )}
                  </ContextMenuTrigger>
                  <ContextMenuContent class="py-1 min-w-36">
                    <ContextMenuItem
                      class="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-300 cursor-pointer outline-none data-highlighted:bg-zinc-700 data-highlighted:text-zinc-100"
                      onSelect={() => props.onRenameStart?.(tab)}
                    >
                      <Pencil size={14} />
                      Rename
                    </ContextMenuItem>
                    <Show when={tab.deletable !== false}>
                      <ContextMenuItem
                        class="flex items-center gap-2 px-3 py-1.5 text-sm text-red-400 cursor-pointer outline-none data-highlighted:bg-zinc-700"
                        onSelect={() => props.onDelete?.(tab)}
                      >
                        <Trash2 size={14} />
                        Delete
                      </ContextMenuItem>
                    </Show>
                  </ContextMenuContent>
                </ContextMenu>
              </Show>
            );
          }}
        </For>
        <TabsIndicator />
      </TabsList>
    </Tabs>
  );
}
