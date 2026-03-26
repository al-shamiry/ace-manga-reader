import { Show, createSignal } from "solid-js";
import { Search, X } from "lucide-solid";

interface SearchToggleProps {
  query: string;
  onQueryChange: (query: string) => void;
}

export function SearchToggle(props: SearchToggleProps) {
  const [open, setOpen] = createSignal(false);

  function close() {
    props.onQueryChange("");
    setOpen(false);
  }

  return (
    <div class="relative">
      <Show
        when={props.query !== "" || open()}
        fallback={
          <button
            class="flex items-center justify-center w-8 h-8 rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors cursor-pointer"
            onClick={() => setOpen(true)}
            title="Search"
          >
            <Search size={16} />
          </button>
        }
      >
        <div class="flex items-center">
          <Search size={15} class="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            ref={(el) => setTimeout(() => el.focus(), 0)}
            type="text"
            placeholder="Search..."
            class="w-44 h-8 pl-8 pr-8 bg-zinc-800 border border-zinc-700 focus:border-indigo-500 text-zinc-100 placeholder:text-zinc-500 rounded-md text-sm outline-none transition-colors"
            value={props.query}
            onInput={(e) => props.onQueryChange(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") close();
            }}
            onBlur={() => { if (!props.query) setOpen(false); }}
          />
          <Show when={props.query}>
            <button
              class="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer"
              onClick={close}
            >
              <X size={14} />
            </button>
          </Show>
        </div>
      </Show>
    </div>
  );
}
