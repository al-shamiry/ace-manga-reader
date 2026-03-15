import { createSignal } from "solid-js";
import { open } from "@tauri-apps/plugin-dialog";

interface Props {
  onSelect: (path: string) => void;
  onRefresh: () => void;
  hasLibrary: boolean;
}

export function DirectoryPicker(props: Props) {
  const [manualPath, setManualPath] = createSignal("");

  async function pickFolder() {
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected === "string" && selected) {
      props.onSelect(selected);
    }
  }

  function submitManual(e: SubmitEvent) {
    e.preventDefault();
    const p = manualPath().trim();
    if (p) props.onSelect(p);
  }

  return (
    <div class="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 shrink-0">
      <button
        onClick={pickFolder}
        class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-sm font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0"
      >
        Select Folder
      </button>
      <form onSubmit={submitManual} class="flex flex-1 gap-2 min-w-0">
        <input
          type="text"
          placeholder="Or paste a path..."
          value={manualPath()}
          onInput={(e) => setManualPath(e.currentTarget.value)}
          class="flex-1 min-w-0 px-3 py-1.5 bg-zinc-800 border border-zinc-700 focus:border-indigo-500 text-zinc-100 placeholder:text-zinc-500 rounded-md text-sm outline-none transition-colors"
        />
        <button
          type="submit"
          class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-sm font-medium transition-colors cursor-pointer shrink-0"
        >
          Go
        </button>
      </form>
      {props.hasLibrary && (
        <button
          onClick={props.onRefresh}
          title="Re-scan folder"
          class="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 rounded-md text-sm transition-colors cursor-pointer shrink-0"
        >
          ↻
        </button>
      )}
    </div>
  );
}
