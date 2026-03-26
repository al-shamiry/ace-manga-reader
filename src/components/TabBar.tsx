import { For, Show, createSignal, createEffect, on } from "solid-js";

interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface Props {
  tabs: Tab[];
  activeTab: string;
  onSelect: (id: string) => void;
  onContextMenu?: (e: MouseEvent, tab: Tab) => void;
  renamingId?: string;
  renamingValue?: string;
  onRenameInput?: (value: string) => void;
  onRenameSubmit?: () => void;
  onRenameCancel?: () => void;
}

export type { Tab };

export function TabBar(props: Props) {
  let containerRef!: HTMLDivElement;
  const tabRefs = new Map<string, HTMLElement>();
  const [indicatorStyle, setIndicatorStyle] = createSignal({ left: "0px", width: "0px" });

  function updateIndicator() {
    const el = tabRefs.get(props.activeTab);
    if (!el || !containerRef) return;
    const containerRect = containerRef.getBoundingClientRect();
    const tabRect = el.getBoundingClientRect();
    setIndicatorStyle({
      left: `${tabRect.left - containerRect.left + containerRef.scrollLeft}px`,
      width: `${tabRect.width}px`,
    });
  }

  createEffect(on(() => props.activeTab, () => {
    requestAnimationFrame(updateIndicator);
  }));

  createEffect(on(() => props.tabs, () => {
    requestAnimationFrame(updateIndicator);
  }));

  return (
    <div ref={containerRef} class="relative flex items-center gap-6 shrink-0 overflow-x-auto border-b border-zinc-800">
      <For each={props.tabs}>
        {(tab) => {
          const isActive = () => props.activeTab === tab.id;
          const isRenaming = () => props.renamingId === tab.id;
          return (
            <Show
              when={!isRenaming()}
              fallback={
                <form
                  class="flex items-center pb-2.5 pt-3"
                  onSubmit={(e) => { e.preventDefault(); props.onRenameSubmit?.(); }}
                >
                  <input
                    autofocus
                    class="h-7 px-2 bg-zinc-800 border border-indigo-500 text-zinc-100 rounded text-sm outline-none w-28"
                    value={props.renamingValue ?? ""}
                    onInput={(e) => props.onRenameInput?.(e.currentTarget.value)}
                    onBlur={() => props.onRenameSubmit?.()}
                    onKeyDown={(e) => { if (e.key === "Escape") props.onRenameCancel?.(); }}
                  />
                </form>
              }
            >
              <button
                ref={(el) => tabRefs.set(tab.id, el)}
                class="relative flex items-center gap-2 pb-2.5 pt-3 text-sm font-medium whitespace-nowrap transition-colors cursor-pointer"
                classList={{
                  "text-indigo-400": isActive(),
                  "text-zinc-500 hover:text-zinc-300": !isActive(),
                }}
                onClick={() => props.onSelect(tab.id)}
                onContextMenu={(e) => props.onContextMenu?.(e, tab)}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span
                    class="text-xs px-1.5 py-0.5 rounded-full"
                    classList={{
                      "bg-zinc-700 text-zinc-300": isActive(),
                      "bg-zinc-800 text-zinc-500": !isActive(),
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            </Show>
          );
        }}
      </For>

      {/* Sliding indicator */}
      <div
        class="absolute bottom-0 h-0.5 bg-indigo-500 rounded-full transition-all duration-300 ease-in-out"
        style={indicatorStyle()}
      />
    </div>
  );
}
