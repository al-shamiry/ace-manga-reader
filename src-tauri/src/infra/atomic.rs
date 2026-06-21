//! Crash-safe JSON persistence shared by every on-disk store.

use std::fs;
use std::io::Write;
use std::path::Path;

use serde::Serialize;

use crate::error::AppResult;

/// Write `value` as pretty JSON to `path` atomically: write to a `.tmp` sibling,
/// fsync, then rename over the target. On Windows `fs::rename` uses `MoveFileExW`.
pub(crate) fn write_atomic_json<T: Serialize>(path: &Path, value: &T) -> AppResult<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let tmp = path.with_extension("tmp");
    let json = serde_json::to_string_pretty(value)?;
    {
        let mut f = fs::File::create(&tmp)?;
        f.write_all(json.as_bytes())?;
        f.sync_all()?;
    }
    fs::rename(&tmp, path)?;
    Ok(())
}
