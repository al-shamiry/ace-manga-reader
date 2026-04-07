import type { JSX, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";

import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import * as SliderPrimitive from "@kobalte/core/slider";

import { cn } from "~/lib/utils";

type SliderRootProps<T extends ValidComponent = "div"> =
  SliderPrimitive.SliderRootProps<T> & { class?: string | undefined };

const Slider = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, SliderRootProps<T>>,
) => {
  const [local, others] = splitProps(props as SliderRootProps, ["class"]);
  return (
    <SliderPrimitive.Root
      class={cn(
        "relative flex w-full touch-none select-none items-center",
        local.class,
      )}
      {...others}
    />
  );
};

type SliderTrackProps<T extends ValidComponent = "div"> =
  SliderPrimitive.SliderTrackProps<T> & { class?: string | undefined };

const SliderTrack = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, SliderTrackProps<T>>,
) => {
  const [local, others] = splitProps(props as SliderTrackProps, ["class"]);
  return (
    <SliderPrimitive.Track
      class={cn("relative h-1 w-full grow rounded-full bg-ink-700", local.class)}
      {...others}
    />
  );
};

type SliderFillProps<T extends ValidComponent = "div"> =
  SliderPrimitive.SliderFillProps<T> & { class?: string | undefined };

const SliderFill = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, SliderFillProps<T>>,
) => {
  const [local, others] = splitProps(props as SliderFillProps, ["class"]);
  return (
    <SliderPrimitive.Fill
      class={cn("absolute h-full rounded-full bg-jade-500", local.class)}
      {...others}
    />
  );
};

type SliderThumbProps<T extends ValidComponent = "span"> =
  SliderPrimitive.SliderThumbProps<T> & {
    class?: string | undefined;
    children?: JSX.Element;
  };

const SliderThumb = <T extends ValidComponent = "span">(
  props: PolymorphicProps<T, SliderThumbProps<T>>,
) => {
  const [local, others] = splitProps(props as SliderThumbProps, [
    "class",
    "children",
  ]);
  return (
    <SliderPrimitive.Thumb
      class={cn(
        "block size-3 -translate-y-1 rounded-full bg-jade-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
        local.class,
      )}
      {...others}
    >
      <SliderPrimitive.Input />
    </SliderPrimitive.Thumb>
  );
};

export { Slider, SliderTrack, SliderFill, SliderThumb };
