import { Show } from "solid-js";

import * as CheckboxPrimitive from "@kobalte/core/checkbox";
import { Check } from "lucide-solid";

import { cn } from "~/lib/cn";

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
        "group flex cursor-pointer items-center gap-2 py-1 text-sm text-ink-300 hover:text-foreground",
        props.class,
      )}
    >
      <CheckboxPrimitive.Input class="peer sr-only" />
      <CheckboxPrimitive.Control
        class={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border transition-colors duration-150",
          "border-ink-600 bg-ink-900 group-hover:border-ink-500",
          "data-[checked]:border-jade-500 data-[checked]:bg-jade-500 data-[checked]:group-hover:border-jade-400",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-jade-500/60 peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-background",
        )}
      >
        <CheckboxPrimitive.Indicator>
          <Check size={12} stroke-width={3} class="text-ink-950" />
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
