import { createSignal, For, JSX, onMount, Show } from "solid-js";

import { open } from "@tauri-apps/plugin-dialog";
import { Folder } from "lucide-solid";

import * as api from "~/api";
import type {
  DisplayMode,
  FitMode,
  LibraryDisplay,
  ReadingMode,
  Settings,
} from "~/types";

import { Checkbox } from "../components/ui/checkbox";
import {
  Slider,
  SliderFill,
  SliderThumb,
  SliderTrack,
} from "../components/ui/slider";
import { Toolbar, ToolbarTitle } from "../components/ui/toolbar";
import { useSources } from "../context/SourcesContext";

const FIT_MODE_OPTIONS: { value: FitMode; label: string }[] = [
  { value: "fit-screen", label: "Fit screen" },
  { value: "fit-width", label: "Fit width" },
  { value: "fit-height", label: "Fit height" },
  { value: "original", label: "Original" },
  { value: "stretch", label: "Stretch" },
];

const READING_MODE_OPTIONS: { value: ReadingMode; label: string }[] = [
  { value: "paged-rtl", label: "Paged RTL" },
  { value: "paged-ltr", label: "Paged LTR" },
  { value: "paged-vertical", label: "Paged vertical" },
  { value: "webtoon", label: "Webtoon" },
];

const DISPLAY_MODE_OPTIONS: { value: DisplayMode; label: string }[] = [
  { value: "compact", label: "Compact grid" },
  { value: "comfortable", label: "Comfortable grid" },
  { value: "cover-only", label: "Cover-only grid" },
  { value: "list", label: "List" },
];

export function SettingsView() {
  const { loadRoot } = useSources();
  const [rootDir, setRootDir] = createSignal<string | null>(null);
  const [fitMode, setFitMode] = createSignal<FitMode>("fit-screen");
  const [readingMode, setReadingMode] = createSignal<ReadingMode>("paged-rtl");
  const [display, setDisplay] = createSignal<LibraryDisplay>({
    display_mode: "comfortable",
    card_size: 8,
    show_unread_badge: false,
    show_continue_button: false,
    show_item_count: true,
  });

  onMount(async () => {
    try {
      const r = await api.settings.getRootDirectory();
      setRootDir(r);
    } catch (e) {
      console.error("Failed to load root directory:", e);
    }
    try {
      const s = await api.settings.getDefaultReaderSettings();
      if (s.fit_mode) setFitMode(s.fit_mode);
      if (s.reading_mode) setReadingMode(s.reading_mode);
    } catch (e) {
      console.error("Failed to load reading defaults:", e);
    }
    try {
      const d = await api.settings.getLibraryDisplay();
      setDisplay(d);
    } catch (e) {
      console.error("Failed to load display options:", e);
    }
  });

  async function pickRoot() {
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected === "string" && selected) {
      await loadRoot(selected);
      setRootDir(selected);
    }
  }

  function saveReadingDefaults() {
    const settings: Settings = {
      fit_mode: fitMode(),
      reading_mode: readingMode(),
    };
    api.settings
      .setDefaultReaderSettings(settings)
      .catch((e) => console.error("Failed to save reading defaults:", e));
  }

  function updateFitMode(mode: FitMode) {
    setFitMode(mode);
    saveReadingDefaults();
  }

  function updateReadingMode(mode: ReadingMode) {
    setReadingMode(mode);
    saveReadingDefaults();
  }

  function updateDisplay(next: LibraryDisplay) {
    setDisplay(next);
    api.settings
      .setLibraryDisplay(next)
      .catch((e) => console.error("Failed to save display options:", e));
  }

  function toggleDisplay(key: keyof LibraryDisplay) {
    const current = display();
    if (typeof current[key] !== "boolean") return;
    updateDisplay({ ...current, [key]: !current[key] });
  }

  return (
    <div class="flex flex-1 flex-col overflow-hidden">
      <Toolbar>
        <ToolbarTitle>Settings</ToolbarTitle>
      </Toolbar>

      {/* Body */}
      <div class="flex-1 overflow-y-auto">
        <div class="mx-auto flex max-w-2xl flex-col gap-12 px-10 py-12">
          <Section
            title="General"
            description="Where Ace looks for your library on disk."
          >
            <Field label="Library folder">
              <div class="flex items-center gap-3">
                <div class="flex h-9 min-w-0 flex-1 items-center truncate rounded-md border border-ink-800 bg-ink-900 px-3 font-mono text-sm text-ink-300">
                  <Show
                    when={rootDir()}
                    fallback={
                      <span class="text-ink-600">No folder selected</span>
                    }
                  >
                    {rootDir()}
                  </Show>
                </div>
                <button
                  class="inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-md bg-ink-800 px-3 text-sm font-medium text-ink-200 transition-colors hover:bg-ink-700"
                  onClick={pickRoot}
                >
                  <Folder size={14} />
                  Change
                </button>
              </div>
            </Field>
          </Section>

          <Section
            title="Reading"
            description="Defaults applied to manga without per-title overrides."
          >
            <Field label="Default fit mode">
              <SegmentedControl
                options={FIT_MODE_OPTIONS}
                value={fitMode()}
                onChange={updateFitMode}
              />
            </Field>
            <Field label="Default reading mode">
              <SegmentedControl
                options={READING_MODE_OPTIONS}
                value={readingMode()}
                onChange={updateReadingMode}
              />
            </Field>
          </Section>

          <Section
            title="Display"
            description="How the library grid looks across all categories."
          >
            <Field label="Display mode">
              <SegmentedControl
                options={DISPLAY_MODE_OPTIONS}
                value={display().display_mode}
                onChange={(mode) =>
                  updateDisplay({ ...display(), display_mode: mode })
                }
              />
            </Field>
            <Field label="Card size">
              <div class="flex items-center gap-3">
                <span class="shrink-0 text-[0.7rem] text-ink-600">Small</span>
                <Slider
                  minValue={1}
                  maxValue={15}
                  step={1}
                  value={[display().card_size]}
                  onChange={(values) =>
                    updateDisplay({ ...display(), card_size: values[0] })
                  }
                  class="flex-1"
                >
                  <SliderTrack>
                    <SliderFill />
                    <SliderThumb />
                  </SliderTrack>
                </Slider>
                <span class="shrink-0 text-[0.7rem] text-ink-600">Large</span>
              </div>
            </Field>
            <Field label="Badges">
              <div class="flex flex-col">
                <Checkbox
                  label="Show unread chapter count"
                  checked={display().show_unread_badge}
                  onChange={() => toggleDisplay("show_unread_badge")}
                />
                <Checkbox
                  label="Show continue reading button"
                  checked={display().show_continue_button}
                  onChange={() => toggleDisplay("show_continue_button")}
                />
              </div>
            </Field>
            <Field label="Category tabs">
              <div class="flex flex-col">
                <Checkbox
                  label="Show number of items"
                  checked={display().show_item_count}
                  onChange={() => toggleDisplay("show_item_count")}
                />
              </div>
            </Field>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section(props: {
  title: string;
  description: string;
  children: JSX.Element;
}) {
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

function Field(props: { label: string; children: JSX.Element }) {
  return (
    <div class="flex flex-col gap-2">
      <label class="text-[0.7rem] font-medium tracking-[0.15em] text-ink-600 uppercase">
        {props.label}
      </label>
      {props.children}
    </div>
  );
}

function SegmentedControl<T extends string>(props: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div class="flex flex-wrap gap-1.5">
      <For each={props.options}>
        {(opt) => {
          const isActive = () => props.value === opt.value;
          return (
            <button
              class="cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
              classList={{
                "bg-jade-600 text-white shadow-sm shadow-jade-950/40":
                  isActive(),
                "bg-ink-800 text-ink-300 hover:bg-ink-700 hover:text-ink-100":
                  !isActive(),
              }}
              onClick={() => props.onChange(opt.value)}
            >
              {opt.label}
            </button>
          );
        }}
      </For>
    </div>
  );
}
