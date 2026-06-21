//! Persistence layer: owns the on-disk JSON files and the in-memory DB cache.
//! Everything here reads or writes app-data; commands and services go through
//! this module rather than touching `serde_json` or paths directly.

pub mod config;
pub mod db;
pub mod history;
