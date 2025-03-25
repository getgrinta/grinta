use tauri::AppHandle;
use tauri_nspanel::ManagerExt;

use crate::MAIN_WINDOW_LABEL;

#[tauri::command]
pub fn show(app_handle: AppHandle) {
    let panel = app_handle.get_webview_panel(MAIN_WINDOW_LABEL).unwrap();

    panel.show();
}

#[tauri::command]
pub fn hide(app_handle: AppHandle) {
    let panel = app_handle.get_webview_panel(MAIN_WINDOW_LABEL).unwrap();

    if panel.is_visible() {
        panel.order_out(None);
    }
}
