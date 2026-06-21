//! Tauri command handlers — the IPC surface registered in `generate_handler!`.
//! Each module holds thin handlers that delegate to the service/store layers.

pub mod history;
pub mod library;
pub mod reader;
pub mod settings;
pub mod sources;
