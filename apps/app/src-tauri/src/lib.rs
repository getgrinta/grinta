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
mod favicon_utils;
mod keyring_utils;
mod calendar_utils;

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
                // Check if we're running in development mode
                let is_dev = cfg!(debug_assertions) || std::env::var("NODE_ENV").unwrap_or_default() == "development";
                if !is_dev {
                    match initialize_master_key() {
                        Ok(_) => {
                            // Master key initialized successfully
                        },
                        Err(e) => eprintln!("Failed to initialize master key: {}", e),
                    }
                }

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
            favicon_utils::fetch_favicon,
            keyring_utils::set_secret,
            keyring_utils::get_secret,
            keyring_utils::delete_secret,
            calendar_utils::get_calendar_authorization_status,
            calendar_utils::request_calendar_access,
            calendar_utils::get_calendars,
            calendar_utils::get_calendar_events,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn initialize_master_key() -> Result<(), String> {
    use crate::keyring_utils::{get_secret, set_secret};
    use base64::{engine::general_purpose::STANDARD, Engine as _};
    use rand::RngCore;

    const KEYRING_SERVICE: &str = "grinta";
    const KEYRING_ACCOUNT_KEY: &str = "master-key";

    match get_secret(KEYRING_SERVICE.to_string(), KEYRING_ACCOUNT_KEY.to_string()) {
        Ok(_) => {
            Ok(())
        }
        Err(_) => {
            println!(
                "Master secret not found, generating and setting..."
            );

            // Generate 32 random bytes
            let mut key_bytes = [0u8; 32];
            rand::thread_rng().fill_bytes(&mut key_bytes);

            // Encode bytes to Base64
            let key_base64 = STANDARD.encode(key_bytes);

            // Set the secret in the keychain
            match set_secret(
                KEYRING_SERVICE.to_string(),
                KEYRING_ACCOUNT_KEY.to_string(),
                key_base64,
            ) {
                Ok(_) => {
                    println!(
                        "Successfully set new master key."
                    );
                    Ok(())
                }
                Err(e) => {
                    let error_msg = format!(
                        "Failed to set master key: {}",
                        e
                    );
                    eprintln!("{}", error_msg);
                    Err(error_msg)
                }
            }
        }
    }
}
