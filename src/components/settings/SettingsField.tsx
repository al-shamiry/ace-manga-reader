import { JSX } from "solid-js";

interface SettingsFieldProps {
  label: string;
  children: JSX.Element;
}

export function SettingsField(props: SettingsFieldProps) {
  return (
    <div class="flex flex-col gap-2">
      <label class="text-[0.7rem] font-medium tracking-[0.15em] text-ink-600 uppercase">
        {props.label}
      </label>
      {props.children}
    </div>
  );
}
