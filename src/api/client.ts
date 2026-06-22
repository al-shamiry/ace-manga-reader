import { invoke } from "@tauri-apps/api/core";

/**
 * The one place the app calls Tauri's `invoke`. Every backend command is
 * wrapped by a typed function in `~/api/*` that delegates here, so the IPC
 * boundary — command strings + snake_case payload keys — lives in this layer
 * only.
 *
 * Rejections are passed through untouched: the Rust side rejects with its
 * `Err(String)`, and callers that surface `String(e)` rely on seeing that raw
 * text. Wrapping in `Error` here would prepend `"Error: "` and change what the
 * user sees, so normalization is intentionally left to the call sites.
 */
export function call<T = void>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  return invoke<T>(command, args);
}
