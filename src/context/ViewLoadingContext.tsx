import { createContext, createSignal, useContext, JSX } from "solid-js";

/**
 * Tracks whether the currently-mounted view has finished its initial data
 * load. The LoadingOverlay reads this signal; views opt in by calling
 * `busy()` synchronously in their component body and `ready()` after their
 * data sources have all resolved.
 *
 * Why a counter, not a boolean: a view may briefly mount, immediately
 * unmount, then remount (e.g. router transitions, suspense boundaries).
 * Sequence numbers let us ignore stale `ready()` calls from a previous
 * mount that resolved after a new mount declared itself busy. Without
 * this, a slow first navigation could mark the second navigation as
 * ready before its data has actually loaded.
 */
interface ViewLoadingContextValue {
  isBusy: () => boolean;
  /** Mark the current view as still loading. Call synchronously in the
   *  component body — runs before first paint. Returns the sequence token
   *  to pass to `ready()`. */
  busy: () => number;
  /** Mark the current view as loaded. Pass the token returned by `busy()`
   *  to ignore late callbacks from a previous mount. */
  ready: (token: number) => void;
}

const ViewLoadingContext = createContext<ViewLoadingContextValue>();

export function ViewLoadingProvider(props: { children: JSX.Element }) {
  const [isBusy, setIsBusy] = createSignal(false);
  let seq = 0;
  let active = 0;

  function busy() {
    seq += 1;
    active = seq;
    setIsBusy(true);
    return active;
  }

  function ready(token: number) {
    // Ignore late callbacks from a previous mount.
    if (token !== active) return;
    setIsBusy(false);
  }

  return (
    <ViewLoadingContext.Provider value={{ isBusy, busy, ready }}>
      {props.children}
    </ViewLoadingContext.Provider>
  );
}

export function useViewLoading() {
  const ctx = useContext(ViewLoadingContext);
  if (!ctx) throw new Error("useViewLoading must be used within ViewLoadingProvider");
  return ctx;
}
