//! Domain logic layer: the real work behind the commands (disk scanning,
//! source relocation, cache maintenance). No `#[tauri::command]` here — these
//! are plain functions over the store and infra layers, orchestrated by
//! `commands`.

pub mod cache;
pub mod relocate;
pub mod scan;
