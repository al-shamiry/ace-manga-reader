import type { ValidComponent } from "solid-js";
import { createSignal, onMount, splitProps } from "solid-js";

import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import * as TabsPrimitive from "@kobalte/core/tabs";

import { cn } from "~/lib/cn";

const Tabs = TabsPrimitive.Root;

type TabsListProps<T extends ValidComponent = "div"> =
  TabsPrimitive.TabsListProps<T> & { class?: string | undefined };

const TabsList = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, TabsListProps<T>>,
) => {
  const [local, others] = splitProps(props as TabsListProps, ["class"]);
  return (
    <TabsPrimitive.List
      class={cn("relative flex shrink-0 items-center gap-6", local.class)}
      {...others}
    />
  );
};

type TabsTriggerProps<T extends ValidComponent = "button"> =
  TabsPrimitive.TabsTriggerProps<T> & { class?: string | undefined };

const TabsTrigger = <T extends ValidComponent = "button">(
  props: PolymorphicProps<T, TabsTriggerProps<T>>,
) => {
  const [local, others] = splitProps(props as TabsTriggerProps, ["class"]);
  return (
    <TabsPrimitive.Trigger
      class={cn(
        "relative flex h-13 cursor-pointer items-center gap-2 rounded-sm text-sm font-medium whitespace-nowrap text-ink-500 transition-colors outline-none hover:text-ink-300 focus-visible:ring-2 focus-visible:ring-jade-500/60 focus-visible:ring-inset data-selected:text-jade-400",
        local.class,
      )}
      {...others}
    />
  );
};

type TabsContentProps<T extends ValidComponent = "div"> =
  TabsPrimitive.TabsContentProps<T> & { class?: string | undefined };

const TabsContent = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, TabsContentProps<T>>,
) => {
  const [local, others] = splitProps(props as TabsContentProps, ["class"]);
  return (
    <TabsPrimitive.Content
      class={cn("outline-none", local.class)}
      {...others}
    />
  );
};

type TabsIndicatorProps<T extends ValidComponent = "div"> =
  TabsPrimitive.TabsIndicatorProps<T> & { class?: string | undefined };

const TabsIndicator = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, TabsIndicatorProps<T>>,
) => {
  const [local, others] = splitProps(props as TabsIndicatorProps, ["class"]);
  const [mounted, setMounted] = createSignal(false);
  onMount(() => requestAnimationFrame(() => setMounted(true)));
  return (
    <TabsPrimitive.Indicator
      class={cn(
        "absolute bottom-0 h-0.5 rounded-full bg-jade-500",
        mounted()
          ? "transition-all duration-300 ease-in-out"
          : "transition-none",
        local.class,
      )}
      {...others}
    />
  );
};

export { Tabs, TabsContent, TabsIndicator, TabsList, TabsTrigger };
