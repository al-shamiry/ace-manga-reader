import type { Component, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";

import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import * as PopoverPrimitive from "@kobalte/core/popover";

import { cn } from "~/lib/utils";

const PopoverTrigger = PopoverPrimitive.Trigger;

const Popover: Component<PopoverPrimitive.PopoverRootProps> = (props) => {
  return <PopoverPrimitive.Root gutter={6} {...props} />;
};

type PopoverContentProps<T extends ValidComponent = "div"> =
  PopoverPrimitive.PopoverContentProps<T> & { class?: string | undefined };

const PopoverContent = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, PopoverContentProps<T>>,
) => {
  const [local, others] = splitProps(props as PopoverContentProps, ["class"]);
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        class={cn(
          "z-50 rounded-lg border border-border bg-popover text-popover-foreground shadow-xl outline-none",
          local.class,
        )}
        {...others}
      />
    </PopoverPrimitive.Portal>
  );
};

export { Popover, PopoverTrigger, PopoverContent };
