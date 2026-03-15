import { JSX, splitProps } from "solid-js";

interface Props extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost";
  iconOnly?: boolean;
}

export function Button(props: Props) {
  const [local, rest] = splitProps(props, ["variant", "iconOnly", "class", "children"]);

  const variant = () =>
    local.variant === "primary"
      ? "bg-indigo-600 hover:bg-indigo-500 text-white"
      : "bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100";

  const size = () => (local.iconOnly ? "w-8 h-8" : "h-8 px-3");

  return (
    <button
      class={`inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer shrink-0 ${size()} ${variant()} ${local.class ?? ""}`}
      {...rest}
    >
      {local.children}
    </button>
  );
}
