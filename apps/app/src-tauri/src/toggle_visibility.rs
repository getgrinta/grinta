use tauri::{command, Emitter};
use tauri_nspanel::ManagerExt;

pub const MAIN_WINDOW_LABEL: &str = "main";

#[command]
#[cfg(target_os = "macos")]
pub fn toggle_visibility(app_handle: tauri::AppHandle) -> Result<String, String> {
    let panel = app_handle.get_webview_panel(MAIN_WINDOW_LABEL).unwrap();

    if panel.is_visible() {
        panel.order_out(None);
    } else {
        panel.show();
        app_handle.emit("focus", ()).unwrap();
    }

    Ok(String::new())
}
