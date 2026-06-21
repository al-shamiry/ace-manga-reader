import type { Component, ComponentProps, JSX, ValidComponent } from "solid-js";
import { Show, splitProps } from "solid-js";

import * as DropdownMenuPrimitive from "@kobalte/core/dropdown-menu";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";

import { cn } from "~/lib/utils";

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
const DropdownMenuSub = DropdownMenuPrimitive.Sub;
const DropdownMenuGroup = DropdownMenuPrimitive.Group;
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

const DropdownMenu: Component<DropdownMenuPrimitive.DropdownMenuRootProps> = (
  props,
) => {
  return <DropdownMenuPrimitive.Root gutter={4} {...props} />;
};

type DropdownMenuContentProps<T extends ValidComponent = "div"> =
  DropdownMenuPrimitive.DropdownMenuContentProps<T> & {
    class?: string | undefined;
  };

const DropdownMenuContent = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, DropdownMenuContentProps<T>>,
) => {
  const [, rest] = splitProps(props as DropdownMenuContentProps, ["class"]);
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        class={cn(
          "z-50 min-w-32 overflow-hidden rounded-lg border border-ink-700/70 bg-ink-800 p-1 text-ink-100 shadow-2xl ring-1 shadow-ink-950/70 ring-ink-950/40 outline-none",
          props.class,
        )}
        {...rest}
      />
    </DropdownMenuPrimitive.Portal>
  );
};

// ── Header ────────────────────────────────────────────────────────────────
// Shared title row for toolbar popovers. Pairs a small-caps-ish title with
// a muted-text Reset affordance that only surfaces when `canReset` is true,
// so an unmodified menu stays visually calm.

interface DropdownMenuHeaderProps {
  children: JSX.Element;
  onReset?: () => void;
  canReset?: boolean;
  class?: string;
}

const DropdownMenuHeader: Component<DropdownMenuHeaderProps> = (props) => {
  return (
    <div
      class={cn(
        "flex items-center justify-between gap-2 px-2 pt-1.5 pb-1.5",
        props.class,
      )}
    >
      <span class="text-sm font-semibold text-ink-100">{props.children}</span>
      <Show when={props.onReset && props.canReset}>
        <button
          type="button"
          class="cursor-pointer rounded px-1 py-0.5 text-2xs font-medium tracking-[0.14em] text-ink-500 uppercase transition-colors hover:text-jade-400 focus-visible:ring-1 focus-visible:ring-jade-500/60 focus-visible:outline-none"
          onClick={props.onReset}
        >
          Reset
        </button>
      </Show>
    </div>
  );
};

type DropdownMenuItemProps<T extends ValidComponent = "div"> =
  DropdownMenuPrimitive.DropdownMenuItemProps<T> & {
    class?: string | undefined;
  };

const DropdownMenuItem = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, DropdownMenuItemProps<T>>,
) => {
  const [, rest] = splitProps(props as DropdownMenuItemProps, ["class"]);
  return (
    <DropdownMenuPrimitive.Item
      class={cn(
        "relative flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-ink-200 transition-colors outline-none select-none focus:bg-ink-700/70 focus:text-ink-50 data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-ink-700/70 data-highlighted:text-ink-50",
        props.class,
      )}
      {...rest}
    />
  );
};

const DropdownMenuShortcut: Component<ComponentProps<"span">> = (props) => {
  const [, rest] = splitProps(props, ["class"]);
  return (
    <span
      class={cn("ml-auto text-xs tracking-widest opacity-60", props.class)}
      {...rest}
    />
  );
};

const DropdownMenuLabel: Component<
  ComponentProps<"div"> & { inset?: boolean }
> = (props) => {
  const [, rest] = splitProps(props, ["class", "inset"]);
  return (
    <div
      class={cn(
        "px-2 py-1.5 text-sm font-semibold",
        props.inset && "pl-8",
        props.class,
      )}
      {...rest}
    />
  );
};

type DropdownMenuSeparatorProps<T extends ValidComponent = "hr"> =
  DropdownMenuPrimitive.DropdownMenuSeparatorProps<T> & {
    class?: string | undefined;
  };

const DropdownMenuSeparator = <T extends ValidComponent = "hr">(
  props: PolymorphicProps<T, DropdownMenuSeparatorProps<T>>,
) => {
  const [, rest] = splitProps(props as DropdownMenuSeparatorProps, ["class"]);
  return (
    <DropdownMenuPrimitive.Separator
      class={cn("-mx-1 my-1 h-px border-0 bg-ink-700/60", props.class)}
      {...rest}
    />
  );
};

type DropdownMenuSubTriggerProps<T extends ValidComponent = "div"> =
  DropdownMenuPrimitive.DropdownMenuSubTriggerProps<T> & {
    class?: string | undefined;
    children?: JSX.Element;
  };

const DropdownMenuSubTrigger = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, DropdownMenuSubTriggerProps<T>>,
) => {
  const [, rest] = splitProps(props as DropdownMenuSubTriggerProps, [
    "class",
    "children",
  ]);
  return (
    <DropdownMenuPrimitive.SubTrigger
      class={cn(
        "flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-none select-none focus:bg-accent data-[state=open]:bg-accent",
        props.class,
      )}
      {...rest}
    >
      {props.children}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="ml-auto size-4"
      >
        <path d="M9 6l6 6l-6 6" />
      </svg>
    </DropdownMenuPrimitive.SubTrigger>
  );
};

type DropdownMenuSubContentProps<T extends ValidComponent = "div"> =
  DropdownMenuPrimitive.DropdownMenuSubContentProps<T> & {
    class?: string | undefined;
  };

const DropdownMenuSubContent = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, DropdownMenuSubContentProps<T>>,
) => {
  const [, rest] = splitProps(props as DropdownMenuSubContentProps, ["class"]);
  return (
    <DropdownMenuPrimitive.SubContent
      class={cn(
        "z-50 min-w-32 overflow-hidden rounded-lg border border-ink-700/70 bg-ink-800 p-1 text-ink-100 shadow-2xl ring-1 shadow-ink-950/70 ring-ink-950/40",
        props.class,
      )}
      {...rest}
    />
  );
};

type DropdownMenuCheckboxItemProps<T extends ValidComponent = "div"> =
  DropdownMenuPrimitive.DropdownMenuCheckboxItemProps<T> & {
    class?: string | undefined;
    children?: JSX.Element;
  };

const DropdownMenuCheckboxItem = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, DropdownMenuCheckboxItemProps<T>>,
) => {
  const [, rest] = splitProps(props as DropdownMenuCheckboxItemProps, [
    "class",
    "children",
  ]);
  return (
    <DropdownMenuPrimitive.CheckboxItem
      class={cn(
        "group relative flex cursor-pointer items-center gap-2 rounded-md py-1.5 pr-2.5 pl-7 text-sm text-ink-200 transition-colors outline-none select-none focus:bg-ink-700/70 focus:text-ink-50 data-checked:text-ink-50 data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-ink-700/70 data-highlighted:text-ink-50",
        props.class,
      )}
      {...rest}
    >
      <span class="absolute left-1.5 flex size-4 items-center justify-center rounded-[3px] border border-ink-600 bg-ink-900 transition-colors group-data-checked:border-jade-500 group-data-checked:bg-jade-500">
        <DropdownMenuPrimitive.ItemIndicator>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="size-3 text-ink-950"
          >
            <path d="M5 12l5 5l10 -10" />
          </svg>
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {props.children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
};

type DropdownMenuGroupLabelProps<T extends ValidComponent = "span"> =
  DropdownMenuPrimitive.DropdownMenuGroupLabelProps<T> & {
    class?: string | undefined;
  };

const DropdownMenuGroupLabel = <T extends ValidComponent = "span">(
  props: PolymorphicProps<T, DropdownMenuGroupLabelProps<T>>,
) => {
  const [, rest] = splitProps(props as DropdownMenuGroupLabelProps, ["class"]);
  return (
    <DropdownMenuPrimitive.GroupLabel
      class={cn(
        "block px-2 pt-1.5 pb-0.5 text-2xs font-semibold tracking-[0.14em] text-ink-500 uppercase",
        props.class,
      )}
      {...rest}
    />
  );
};

type DropdownMenuRadioItemProps<T extends ValidComponent = "div"> =
  DropdownMenuPrimitive.DropdownMenuRadioItemProps<T> & {
    class?: string | undefined;
    children?: JSX.Element;
  };

const DropdownMenuRadioItem = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, DropdownMenuRadioItemProps<T>>,
) => {
  const [, rest] = splitProps(props as DropdownMenuRadioItemProps, [
    "class",
    "children",
  ]);
  return (
    <DropdownMenuPrimitive.RadioItem
      class={cn(
        "relative flex cursor-pointer items-center rounded-md py-1.5 pr-2.5 pl-7 text-sm text-ink-200 transition-colors outline-none select-none focus:bg-ink-700/70 focus:text-ink-50 data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-ink-700/70 data-highlighted:text-ink-50",
        props.class,
      )}
      {...rest}
    >
      <span class="absolute left-1.5 flex size-4 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="size-2 fill-current"
          >
            <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
          </svg>
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {props.children}
    </DropdownMenuPrimitive.RadioItem>
  );
};

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuGroupLabel,
  DropdownMenuHeader,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
};
