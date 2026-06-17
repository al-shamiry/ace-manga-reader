use std::fmt;

/// Application-wide error returned by every Tauri command.
///
/// It serializes to its display string, so the frontend keeps receiving plain
/// error messages exactly as before (each `invoke` is wrapped in `try/catch`).
#[derive(Debug)]
pub enum AppError {
    Io(std::io::Error),
    Zip(zip::result::ZipError),
    Json(serde_json::Error),
    Tauri(tauri::Error),
    /// A `Mutex` guarding shared state was poisoned.
    Lock,
    /// A requested entity (source, manga, category, …) does not exist.
    NotFound(String),
    /// The caller supplied invalid input or requested an invalid operation.
    Invalid(String),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AppError::Io(e) => write!(f, "{e}"),
            AppError::Zip(e) => write!(f, "{e}"),
            AppError::Json(e) => write!(f, "{e}"),
            AppError::Tauri(e) => write!(f, "{e}"),
            AppError::Lock => write!(f, "internal state lock was poisoned"),
            AppError::NotFound(msg) | AppError::Invalid(msg) => write!(f, "{msg}"),
        }
    }
}

impl std::error::Error for AppError {}

impl From<std::io::Error> for AppError {
    fn from(e: std::io::Error) -> Self {
        AppError::Io(e)
    }
}

impl From<zip::result::ZipError> for AppError {
    fn from(e: zip::result::ZipError) -> Self {
        AppError::Zip(e)
    }
}

impl From<serde_json::Error> for AppError {
    fn from(e: serde_json::Error) -> Self {
        AppError::Json(e)
    }
}

impl From<tauri::Error> for AppError {
    fn from(e: tauri::Error) -> Self {
        AppError::Tauri(e)
    }
}

impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

pub type AppResult<T> = Result<T, AppError>;
