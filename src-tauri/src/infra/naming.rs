//! Stable identifiers, path normalization, title derivation, and small value
//! helpers (natural ordering and wall-clock time).

use std::path::Path;

use sha2::{Digest, Sha256};

/// Forward-slash-normalized string form of a path — Windows-safe and stable
/// across platforms, used for hashing and frontend transport.
pub(crate) fn normalize(path: &Path) -> String {
    path.to_string_lossy().replace('\\', "/")
}

/// Deterministic id for a path: the first 8 bytes of SHA-256 over its
/// normalized form, hex-encoded.
pub(crate) fn path_id(path: &Path) -> String {
    let mut hasher = Sha256::new();
    hasher.update(normalize(path).as_bytes());
    hex::encode(&hasher.finalize()[..8])
}

/// Derive a display title from a path's file stem: strip download-tool hash
/// suffixes like `_299d43`, and restore Windows-safe `_ ` → `: ` substitutions.
pub(crate) fn title_from_path(path: &Path) -> String {
    let stem = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Unknown");

    // Strip download-tool hash suffixes like "_299d43" or "_1a2b3c4d"
    if let Some(idx) = stem.rfind('_') {
        let suffix = &stem[idx + 1..];
        if (4..=16).contains(&suffix.len()) && suffix.chars().all(|c| c.is_ascii_hexdigit()) {
            return stem[..idx].to_string();
        }
    }
    stem.replace("_ ", ": ")
}

/// Natural sort comparison — numbers within strings are compared numerically.
/// e.g. "Issue#2" < "Issue#10"
pub(crate) fn natural_cmp(a: &str, b: &str) -> std::cmp::Ordering {
    let mut ai = a.chars().peekable();
    let mut bi = b.chars().peekable();
    loop {
        match (ai.peek(), bi.peek()) {
            (None, None) => return std::cmp::Ordering::Equal,
            (None, _) => return std::cmp::Ordering::Less,
            (_, None) => return std::cmp::Ordering::Greater,
            (Some(ac), Some(bc)) if ac.is_ascii_digit() && bc.is_ascii_digit() => {
                let na: u64 = ai.by_ref().take_while(|c| c.is_ascii_digit()).collect::<String>().parse().unwrap_or(0);
                let nb: u64 = bi.by_ref().take_while(|c| c.is_ascii_digit()).collect::<String>().parse().unwrap_or(0);
                let ord = na.cmp(&nb);
                if ord != std::cmp::Ordering::Equal { return ord; }
            }
            _ => {
                let ac = ai.next().unwrap().to_lowercase().next().unwrap();
                let bc = bi.next().unwrap().to_lowercase().next().unwrap();
                let ord = ac.cmp(&bc);
                if ord != std::cmp::Ordering::Equal { return ord; }
            }
        }
    }
}

/// Returns the current Unix timestamp in seconds.
pub(crate) fn now_epoch() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}
