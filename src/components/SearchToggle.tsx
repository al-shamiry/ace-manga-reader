import { Show, createSignal } from "solid-js";
import { Search, X } from "lucide-solid";
import { TextField, TextFieldInput } from "./ui/text-field";

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
            class="flex items-center justify-center w-8 h-8 rounded-md text-ink-500 hover:bg-ink-800 hover:text-ink-300 transition-colors cursor-pointer"
            onClick={() => setOpen(true)}
            title="Search"
          >
            <Search size={16} />
          </button>
        }
      >
        <div class="flex items-center">
          <Search
            size={15}
            class="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-500 pointer-events-none z-10"
          />
          <TextField
            value={props.query}
            onChange={(value) => props.onQueryChange(value)}
            class="w-44"
          >
            <TextFieldInput
              ref={(el: HTMLInputElement) => setTimeout(() => el.focus(), 0)}
              type="text"
              placeholder="Search..."
              class="pl-8 pr-8"
              onKeyDown={(e: KeyboardEvent) => {
                if (e.key === "Escape") close();
              }}
              onBlur={() => {
                if (!props.query) setOpen(false);
              }}
            />
          </TextField>
          <Show when={props.query}>
            <button
              class="absolute right-2 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-300 cursor-pointer"
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
