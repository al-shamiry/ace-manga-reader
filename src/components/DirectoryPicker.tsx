import { createSignal } from "solid-js";
import { open } from "@tauri-apps/plugin-dialog";

interface Props {
  onSelect: (path: string) => void;
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
    <div class="directory-picker">
      <button onClick={pickFolder}>Select Folder</button>
      <form onSubmit={submitManual}>
        <input
          type="text"
          placeholder="Or paste a path..."
          value={manualPath()}
          onInput={(e) => setManualPath(e.currentTarget.value)}
        />
        <button type="submit">Go</button>
      </form>
    </div>
  );
}
