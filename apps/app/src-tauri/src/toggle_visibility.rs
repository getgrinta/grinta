

use tauri::{command, Emitter};
use tauri_nspanel::ManagerExt;

use crate::window;

pub const SPOTLIGHT_LABEL: &str = "main";

#[command]
#[cfg(target_os = "macos")]
pub fn toggle_visibility(app_handle: tauri::AppHandle) -> Result<String, String> {
    let panel = app_handle.get_webview_panel(SPOTLIGHT_LABEL).unwrap();

    if panel.is_visible() {
        panel.order_out(None);
    } else {
        //window.center_at_cursor_monitor().unwrap();

        panel.show();

        app_handle.emit("focus", ()).unwrap();
    }

    Ok(String::new())
}
