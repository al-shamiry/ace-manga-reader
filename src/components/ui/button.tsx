import type { JSX, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";

import * as ButtonPrimitive from "@kobalte/core/button";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";

import { cn } from "~/lib/utils";

type ButtonProps<T extends ValidComponent = "button"> = ButtonPrimitive.ButtonRootProps<T> & {
  class?: string | undefined;
  children?: JSX.Element;
  variant?: "primary" | "ghost";
  iconOnly?: boolean;
};

const Button = <T extends ValidComponent = "button">(
  props: PolymorphicProps<T, ButtonProps<T>>,
) => {
  const [local, others] = splitProps(props as ButtonProps, [
    "variant",
    "iconOnly",
    "class",
  ]);

  const variantClass = () =>
    local.variant === "primary"
      ? "bg-primary hover:bg-primary-hover text-primary-foreground"
      : "bg-accent hover:bg-accent/80 text-muted-foreground hover:text-foreground";

  const sizeClass = () => (local.iconOnly ? "w-8 h-8" : "h-8 px-3");

  return (
    <ButtonPrimitive.Root
      class={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        sizeClass(),
        variantClass(),
        local.class,
      )}
      {...others}
    />
  );
};

export { Button };
export type { ButtonProps };
