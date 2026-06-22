import { JSX } from "solid-js";

interface SettingsSectionProps {
  title: string;
  description: string;
  children: JSX.Element;
}

export function SettingsSection(props: SettingsSectionProps) {
  return (
    <section class="flex flex-col gap-5">
      <div>
        <h2 class="font-display text-xl text-ink-100">{props.title}</h2>
        <p class="mt-1 text-sm text-ink-500">{props.description}</p>
      </div>
      <div class="flex flex-col gap-5 border-t border-ink-800/80 pt-5">
        {props.children}
      </div>
    </section>
  );
}
