import { useNavigate } from "@solidjs/router";

import { open } from "@tauri-apps/plugin-dialog";

import { useLibrary } from "~/context/LibraryContext";
import { useSources } from "~/context/SourcesContext";

/**
 * First-run state + action. `isFirstRun()` is true only on a fresh install —
 * no sources AND no library entries; that's the one signal that distinguishes
 * "never configured" from "has a library but cleared it". `chooseFolder()`
 * opens the folder picker, adds the pick as a source, and routes to /sources.
 */
export function createFirstRun() {
  const { sources, addSource } = useSources();
  const { libraryEntries } = useLibrary();
  const navigate = useNavigate();

  const isFirstRun = () =>
    sources().length === 0 && libraryEntries().length === 0;

  async function chooseFolder() {
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected === "string" && selected) {
      await addSource(selected);
      navigate("/sources");
    }
  }

  return { isFirstRun, chooseFolder };
}
