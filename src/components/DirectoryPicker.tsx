import { createSignal } from "solid-js";
import { open } from "@tauri-apps/plugin-dialog";
import { RefreshCw } from "lucide-solid";
import { Button } from "./Button";

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
      <Button variant="primary" onClick={pickFolder}>
        Select Folder
      </Button>
      <form onSubmit={submitManual} class="flex items-center flex-1 gap-2 min-w-0">
        <input
          type="text"
          placeholder="Or paste a path..."
          value={manualPath()}
          onInput={(e) => setManualPath(e.currentTarget.value)}
          class="flex-1 min-w-0 h-8 px-3 bg-zinc-800 border border-zinc-700 focus:border-indigo-500 text-zinc-100 placeholder:text-zinc-500 rounded-md text-sm outline-none transition-colors"
        />
        <Button variant="primary" type="submit">
          Go
        </Button>
      </form>
      {props.hasLibrary && (
        <Button variant="ghost" iconOnly onClick={props.onRefresh} title="Re-scan folder">
          <RefreshCw size={14} />
        </Button>
      )}
    </div>
  );
}
