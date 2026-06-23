import type { JSX, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";

import * as DialogPrimitive from "@kobalte/core/dialog";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";

import { cn } from "~/lib/cn";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogCloseButton = DialogPrimitive.CloseButton;

type DialogContentProps<T extends ValidComponent = "div"> =
  DialogPrimitive.DialogContentProps<T> & {
    class?: string | undefined;
    children?: JSX.Element;
  };

const DialogContent = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, DialogContentProps<T>>,
) => {
  const [local, others] = splitProps(props as DialogContentProps, [
    "class",
    "children",
  ]);
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay class="dialog-overlay fixed inset-0 z-50 bg-ink-950/70 backdrop-blur-[1px]" />
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <DialogPrimitive.Content
          class={cn(
            "dialog-content relative flex w-full max-w-md flex-col rounded-xl border border-ink-700/70 bg-ink-900 text-ink-100 shadow-2xl shadow-ink-950/70 outline-none",
            local.class,
          )}
          {...others}
        >
          {local.children}
        </DialogPrimitive.Content>
      </div>
    </DialogPrimitive.Portal>
  );
};

type DialogTitleProps<T extends ValidComponent = "h2"> =
  DialogPrimitive.DialogTitleProps<T> & { class?: string | undefined };

const DialogTitle = <T extends ValidComponent = "h2">(
  props: PolymorphicProps<T, DialogTitleProps<T>>,
) => {
  const [local, others] = splitProps(props as DialogTitleProps, ["class"]);
  return (
    <DialogPrimitive.Title
      class={cn("font-display text-lg text-ink-100", local.class)}
      {...others}
    />
  );
};

export { Dialog, DialogCloseButton, DialogContent, DialogTitle, DialogTrigger };
