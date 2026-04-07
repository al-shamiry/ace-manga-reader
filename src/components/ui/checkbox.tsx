import { Show } from "solid-js";

import * as CheckboxPrimitive from "@kobalte/core/checkbox";
import { Check } from "lucide-solid";

import { cn } from "~/lib/utils";

interface CheckboxProps {
  checked: boolean;
  onChange: () => void;
  label?: string;
  class?: string;
}

const Checkbox = (props: CheckboxProps) => {
  return (
    <CheckboxPrimitive.Root
      checked={props.checked}
      onChange={() => props.onChange()}
      class={cn(
        "flex items-center gap-2 py-1 cursor-pointer text-sm text-zinc-300 hover:text-foreground group",
        props.class,
      )}
    >
      <CheckboxPrimitive.Input class="peer sr-only" />
      <CheckboxPrimitive.Control
        class={cn(
          "flex items-center justify-center w-4 h-4 rounded shrink-0 border transition-all duration-150",
          "border-zinc-600 bg-zinc-900 group-hover:border-zinc-500",
          "data-checked:bg-indigo-500 data-checked:border-indigo-500",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-background",
        )}
      >
        <CheckboxPrimitive.Indicator>
          <Check size={12} stroke-width={3} class="text-white" />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Control>
      <Show when={props.label}>
        <CheckboxPrimitive.Label class="truncate select-none">
          {props.label}
        </CheckboxPrimitive.Label>
      </Show>
    </CheckboxPrimitive.Root>
  );
};

export { Checkbox };
