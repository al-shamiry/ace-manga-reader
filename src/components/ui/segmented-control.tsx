import { For } from "solid-js";

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>(
  props: SegmentedControlProps<T>,
) {
  return (
    <div class="flex flex-wrap gap-1.5">
      <For each={props.options}>
        {(opt) => {
          const isActive = () => props.value === opt.value;
          return (
            <button
              class="cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
              classList={{
                "bg-jade-600 text-white shadow-sm shadow-jade-950/40":
                  isActive(),
                "bg-ink-800 text-ink-300 hover:bg-ink-700 hover:text-ink-100":
                  !isActive(),
              }}
              onClick={() => props.onChange(opt.value)}
            >
              {opt.label}
            </button>
          );
        }}
      </For>
    </div>
  );
}
