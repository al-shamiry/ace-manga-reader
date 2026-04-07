import { For, JSX, Show, createSignal, onMount } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { Folder } from "lucide-solid";
import { useLibrary } from "../context/LibraryContext";
import { Slider, SliderFill, SliderThumb, SliderTrack } from "../components/ui/slider";
import { Checkbox } from "../components/ui/checkbox";
import type {
  DisplayMode,
  FitMode,
  LibraryDisplay,
  ReadingMode,
  Settings,
} from "../types";

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
  const { loadRoot } = useLibrary();
  const [rootDir, setRootDir] = createSignal<string | null>(null);
  const [fitMode, setFitMode] = createSignal<FitMode>("fit-screen");
  const [readingMode, setReadingMode] = createSignal<ReadingMode>("paged-rtl");
  const [display, setDisplay] = createSignal<LibraryDisplay>({
    display_mode: "comfortable",
    card_size: 8,
    show_unread_badge: false,
    show_continue_button: false,
    show_category_tabs: true,
    show_item_count: true,
  });

  onMount(async () => {
    try {
      const r = await invoke<string | null>("get_root_directory");
      setRootDir(r);
    } catch (e) {
      console.error("Failed to load root directory:", e);
    }
    try {
      const s = await invoke<Settings>("get_settings", { mangaId: null });
      if (s.fit_mode) setFitMode(s.fit_mode);
      if (s.reading_mode) setReadingMode(s.reading_mode);
    } catch (e) {
      console.error("Failed to load reading defaults:", e);
    }
    try {
      const d = await invoke<LibraryDisplay>("get_library_display");
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

  // Global reading defaults overwrite both fields in config.json on every save,
  // so always send both current values together — sending one alone would
  // wipe the other.
  function saveReadingDefaults(next: { fit_mode: FitMode; reading_mode: ReadingMode }) {
    invoke("set_settings", {
      settings: { fit_mode: next.fit_mode, reading_mode: next.reading_mode },
      mangaId: null,
    }).catch((e) => console.error("Failed to save reading defaults:", e));
  }

  function updateFitMode(mode: FitMode) {
    setFitMode(mode);
    saveReadingDefaults({ fit_mode: mode, reading_mode: readingMode() });
  }

  function updateReadingMode(mode: ReadingMode) {
    setReadingMode(mode);
    saveReadingDefaults({ fit_mode: fitMode(), reading_mode: mode });
  }

  function updateDisplay(next: LibraryDisplay) {
    setDisplay(next);
    invoke("set_library_display", { display: next }).catch((e) =>
      console.error("Failed to save display options:", e),
    );
  }

  function toggleDisplay(key: keyof LibraryDisplay) {
    const current = display();
    if (typeof current[key] !== "boolean") return;
    updateDisplay({ ...current, [key]: !current[key] });
  }

  return (
    <div class="flex flex-col flex-1 overflow-hidden">
      {/* Toolbar — matches LibraryView/HistoryView band height */}
      <div class="flex items-center px-4 h-13 bg-ink-900 border-b border-ink-800 shrink-0">
        <p class="text-xs uppercase tracking-[0.2em] text-ink-500 font-medium">Settings</p>
      </div>

      {/* Body */}
      <div class="flex-1 overflow-y-auto">
        <div class="max-w-2xl mx-auto px-10 py-12 flex flex-col gap-12">
          <Section
            title="General"
            description="Where Ace looks for your library on disk."
          >
            <Field label="Library folder">
              <div class="flex items-center gap-3">
                <div class="flex-1 min-w-0 h-9 px-3 flex items-center bg-ink-900 border border-ink-800 rounded-md text-sm text-ink-300 font-mono truncate">
                  <Show
                    when={rootDir()}
                    fallback={<span class="text-ink-600">No folder selected</span>}
                  >
                    {rootDir()}
                  </Show>
                </div>
                <button
                  class="h-9 px-3 inline-flex items-center gap-2 rounded-md bg-ink-800 hover:bg-ink-700 text-ink-200 text-sm font-medium transition-colors cursor-pointer shrink-0"
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
                onChange={(mode) => updateDisplay({ ...display(), display_mode: mode })}
              />
            </Field>
            <Field label="Card size">
              <div class="flex items-center gap-3">
                <span class="text-[0.7rem] text-ink-600 shrink-0">Small</span>
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
                <span class="text-[0.7rem] text-ink-600 shrink-0">Large</span>
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
                  label="Show category tabs"
                  checked={display().show_category_tabs}
                  onChange={() => toggleDisplay("show_category_tabs")}
                />
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
        <p class="text-sm text-ink-500 mt-1">{props.description}</p>
      </div>
      <div class="flex flex-col gap-5 pt-5 border-t border-ink-800/80">
        {props.children}
      </div>
    </section>
  );
}

function Field(props: { label: string; children: JSX.Element }) {
  return (
    <div class="flex flex-col gap-2">
      <label class="text-[0.7rem] uppercase tracking-[0.15em] text-ink-600 font-medium">
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
              class="px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer"
              classList={{
                "bg-jade-600 text-white shadow-sm shadow-jade-950/40": isActive(),
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
