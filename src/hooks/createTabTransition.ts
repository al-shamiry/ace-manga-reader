import { createSignal } from "solid-js";

interface TabLike {
  id: string;
}

interface TabTransitionOptions {
  /** Current ordered tab list — index order drives the slide direction. */
  tabs: () => TabLike[];
  /** Accessor for the active tab id. */
  activeTab: () => string;
  /** Commit the new active tab (e.g. a setActiveTab signal setter). */
  setActiveTab: (id: string) => void;
  /** Optional side effect run once the switch commits (e.g. persist). */
  onCommit?: (id: string) => void;
}

/**
 * Directional tab-switch animation companion to the common `TabBar`. Returns a
 * `slideClass` to apply to the content container and a `switchTab` handler to
 * wire to the bar. Fades the old content out, swaps the active tab, then slides
 * the new content in from the side the user moved toward (~300ms total). Guards
 * against re-entrancy so rapid clicks can't overlap transitions.
 */
export function createTabTransition(opts: TabTransitionOptions) {
  const [slideClass, setSlideClass] = createSignal("");
  let switching = false;

  function switchTab(newTab: string) {
    if (switching) return;
    const tabs = opts.tabs();
    const oldIndex = tabs.findIndex((t) => t.id === opts.activeTab());
    const newIndex = tabs.findIndex((t) => t.id === newTab);
    if (oldIndex === newIndex) return;

    switching = true;
    const slideIn = newIndex > oldIndex ? "slide-in-left" : "slide-in-right";

    // Fade out old content
    setSlideClass("tab-fade-out");
    setTimeout(() => {
      opts.setActiveTab(newTab);
      opts.onCommit?.(newTab);
      setSlideClass(slideIn);
      setTimeout(() => {
        setSlideClass("");
        switching = false;
      }, 200);
    }, 100);
  }

  return { slideClass, switchTab };
}
