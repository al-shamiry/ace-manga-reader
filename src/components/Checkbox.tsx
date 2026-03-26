import { Show } from "solid-js";
import { Check } from "lucide-solid";

interface CheckboxProps {
  checked: boolean;
  onChange: () => void;
  label?: string;
  class?: string;
}

export function Checkbox(props: CheckboxProps) {
  return (
    <label
      class={`flex items-center gap-2 py-1 cursor-pointer text-sm text-zinc-300 hover:text-zinc-100 group ${props.class ?? ""}`}
      onClick={(e) => {
        e.preventDefault();
        props.onChange();
      }}
    >
      <span
        class={`flex items-center justify-center w-4 h-4 rounded shrink-0 border transition-all duration-150 ${
          props.checked
            ? "bg-indigo-500 border-indigo-500"
            : "border-zinc-600 bg-zinc-900 group-hover:border-zinc-500"
        }`}
      >
        <Show when={props.checked}>
          <Check size={12} stroke-width={3} class="text-white" />
        </Show>
      </span>
      <Show when={props.label}>
        <span class="truncate">{props.label}</span>
      </Show>
    </label>
  );
}
