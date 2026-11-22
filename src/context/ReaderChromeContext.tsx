import { createContext, createSignal, JSX, useContext } from "solid-js";

/**
 * Bridges the reader's overlay-bar state up to the app shell, so the window
 * title bar (rendered by `AppShell`, outside the reader route) hides and
 * shows together with the reader's own bars. `ReaderView` registers its
 * chrome on mount; the shell reads it. Nothing is registered outside the reader.
 */
export type ReaderChromeState = {
  /** The user's hide choice: bars leave the layout and become an overlay. */
  hidden: () => boolean;
  /** Whether the bars are currently on screen (hidden bars can still peek). */
  visible: () => boolean;
};

interface ReaderChromeContextValue {
  chrome: () => ReaderChromeState | undefined;
  /** Register the active reader's chrome. Returns an unregister function. */
  register: (state: ReaderChromeState) => () => void;
}

const ReaderChromeContext = createContext<ReaderChromeContextValue>();

export function ReaderChromeProvider(props: { children: JSX.Element }) {
  const [chrome, setChrome] = createSignal<ReaderChromeState>();
  // Plain mirror of the signal so a stale unregister (from a reader that
  // unmounted after a newer one registered) can be ignored without tracking.
  let active: ReaderChromeState | undefined;

  function register(state: ReaderChromeState) {
    active = state;
    setChrome(() => state);
    return () => {
      if (active !== state) return;
      active = undefined;
      setChrome(undefined);
    };
  }

  return (
    <ReaderChromeContext.Provider value={{ chrome, register }}>
      {props.children}
    </ReaderChromeContext.Provider>
  );
}

export function useReaderChrome() {
  const ctx = useContext(ReaderChromeContext);
  if (!ctx)
    throw new Error("useReaderChrome must be used within ReaderChromeProvider");
  return ctx;
}
