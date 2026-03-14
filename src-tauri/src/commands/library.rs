use crate::models::comic::Comic;

#[tauri::command]
pub fn scan_directory(_path: String) -> Result<Vec<Comic>, String> {
    Ok(vec![])
}
