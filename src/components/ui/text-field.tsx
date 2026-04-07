import type { ValidComponent } from "solid-js";
import { mergeProps, splitProps } from "solid-js";

import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import * as TextFieldPrimitive from "@kobalte/core/text-field";

import { cn } from "~/lib/utils";

type TextFieldRootProps<T extends ValidComponent = "div"> =
  TextFieldPrimitive.TextFieldRootProps<T> & { class?: string | undefined };

const TextField = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, TextFieldRootProps<T>>,
) => {
  const [local, others] = splitProps(props as TextFieldRootProps, ["class"]);
  return (
    <TextFieldPrimitive.Root
      class={cn("flex flex-col gap-1", local.class)}
      {...others}
    />
  );
};

type TextFieldInputProps<T extends ValidComponent = "input"> =
  TextFieldPrimitive.TextFieldInputProps<T> & {
    class?: string | undefined;
    type?: "text" | "search" | "email" | "password" | "url" | "tel" | "number";
  };

const TextFieldInput = <T extends ValidComponent = "input">(
  rawProps: PolymorphicProps<T, TextFieldInputProps<T>>,
) => {
  const props = mergeProps<TextFieldInputProps<T>[]>({ type: "text" }, rawProps);
  const [local, others] = splitProps(props as TextFieldInputProps, [
    "type",
    "class",
  ]);
  return (
    <TextFieldPrimitive.Input
      type={local.type}
      class={cn(
        "h-8 w-full rounded-md border border-input bg-popover px-2 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50",
        local.class,
      )}
      {...others}
    />
  );
};

export { TextField, TextFieldInput };
