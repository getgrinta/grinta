use cocoa::base::{id, YES};
use objc::{class, msg_send, sel, sel_impl};
use tauri::{Listener as _, Manager as _};
use tauri_nspanel::ManagerExt as _;
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_deep_link::DeepLinkExt;

use window::WebviewWindowExt as _;
mod command;
mod icns_utils;
mod spotlight_utils;
mod theme_utils;
mod window;
mod toggle_visibility;
mod workspace_utils;

pub const MAIN_WINDOW_LABEL: &str = "main";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![command::show, command::hide])
        .plugin(tauri_nspanel::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .plugin(tauri_plugin_single_instance::init(|_app, _args, _cwd| {}))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_macos_permissions::init())
        .setup(|app| {
            #[cfg(target_os = "macos")]
            {
                app.set_activation_policy(tauri::ActivationPolicy::Accessory);

                let handle = app.app_handle();

                let window = handle.get_webview_window(MAIN_WINDOW_LABEL).unwrap();

                // Convert the window to a spotlight panel
                let panel = window.to_spotlight_panel()?;

                let _ = window.with_webview(|webview| {
                    let inner = webview.inner();
                    unsafe {
                        let _: () = msg_send![inner as id, setInspectable: YES];
                    }
                });

                unsafe {
                    let panel = app.get_webview_panel(MAIN_WINDOW_LABEL).unwrap();
                    let view = panel.content_view();

                    // Create a block to execute our UI updates
                    use block2::ConcreteBlock;

                    let update_block = ConcreteBlock::new(move || -> () {
                        let layer: id = msg_send![view as id, layer];
                        let _: () = msg_send![layer, setCornerRadius: 20.0];
                        let _: () = msg_send![layer, setMasksToBounds: YES];
                        // Force layout update - using NSView methods
                        let _: () = msg_send![view as id, setNeedsDisplay: YES];

                        // Update the layer
                        let _: () = msg_send![layer, setNeedsDisplay];
                    });

                    let update_block = update_block.copy();

                    // Get the main dispatch queue and schedule the block
                    let main_queue: id = msg_send![class!(NSOperationQueue), mainQueue];
                    let _: () = msg_send![main_queue, addOperationWithBlock:update_block];
                }

                handle.listen(
                    format!("{}_panel_did_resign_key", MAIN_WINDOW_LABEL),
                    move |_| {
                        panel.order_out(None);
                    },
                );
            }
            Ok(())
        })
        .manage(spotlight_utils::SpotlightState::new())
        .manage(workspace_utils::WorkspaceState::new())
        .invoke_handler(tauri::generate_handler![
            theme_utils::set_vibrancy,
            theme_utils::set_appearance,
            icns_utils::load_app_info,
            icns_utils::load_extension_icons,
            spotlight_utils::search_spotlight_apps,
            toggle_visibility::toggle_visibility,
            workspace_utils::activate_application_by_name,
            workspace_utils::get_frontmost_application_name,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
