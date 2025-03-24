use cocoa::base::{id, YES};
use objc::{class, msg_send, sel, sel_impl};
use tauri::{Emitter, Manager as _, Runtime, Window};
use tauri_nspanel::ManagerExt as _;
use tauri_plugin_autostart::MacosLauncher;

use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut, ShortcutState};
use window::WebviewWindowExt as _;
mod command;
mod icns_utils;
mod spotlight_utils;
mod theme_utils;
mod window;
mod toggle_visibility;

pub const SPOTLIGHT_LABEL: &str = "main";

use tauri::command;


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![command::show, command::hide])
        .plugin(tauri_nspanel::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .plugin(tauri_plugin_single_instance::init(|_app, _args, _cwd| {}))
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            #[cfg(target_os = "macos")]
            {
                app.set_activation_policy(tauri::ActivationPolicy::Accessory);

                let handle = app.app_handle();

                let window = handle.get_webview_window(SPOTLIGHT_LABEL).unwrap();

                // Convert the window to a spotlight panel
                let panel = window.to_spotlight_panel()?;

                window.with_webview(|webview| {
                    let inner = webview.inner();
                    unsafe {
                        let _: () = msg_send![inner as id, setInspectable: YES];
                    }
                });

                unsafe {
                    let panel = app.get_webview_panel(SPOTLIGHT_LABEL).unwrap();
                    let view = panel.content_view();

                    // Create a block to execute our UI updates
                    use block2::{Block, ConcreteBlock};

                    let update_block = ConcreteBlock::new(move || -> () {
                        unsafe {
                            let layer: id = msg_send![view as id, layer];
                            let _: () = msg_send![layer, setCornerRadius: 20.0];
                            let _: () = msg_send![layer, setMasksToBounds: YES];

                            // Force layout update - using NSView methods
                            let _: () = msg_send![view as id, setNeedsDisplay: YES];

                            // Update the layer
                            let _: () = msg_send![layer, setNeedsDisplay];
                        }
                    });

                    let update_block = update_block.copy();

                    // Get the main dispatch queue and schedule the block
                    let main_queue: id = msg_send![class!(NSOperationQueue), mainQueue];
                    let _: () = msg_send![main_queue, addOperationWithBlock:update_block];
                }

                use tauri::Listener;

                // handle.listen(
                //     format!("{}_panel_did_resign_key", SPOTLIGHT_LABEL),
                //     move |_| {
                //         panel.order_out(None);
                //     },
                // );
            }

            Ok({})
        })
        // .plugin(
        //     tauri_plugin_global_shortcut::Builder::new()
        //         .with_shortcut(Shortcut::new(Some(Modifiers::SUPER), Code::Space))
        //         .unwrap()
        //         .with_handler(|app, shortcut, event| {
        //             let window = app.get_webview_window(SPOTLIGHT_LABEL).unwrap();
        //             let panel = app.get_webview_panel(SPOTLIGHT_LABEL).unwrap();

        //             if event.state == ShortcutState::Pressed
        //                 && shortcut.matches(Modifiers::SUPER, Code::Space)
        //             {
        //                 window.with_webview(|webview| {
        //                     let inner = webview.inner();
        //                     unsafe {
        //                         let _: () = msg_send![inner as id, setInspectable: YES];
        //                     }
        //                 });

        //                 unsafe {
        //                     let view = panel.content_view();

        //                     // Create a block to execute our UI updates
        //                     use block2::{Block, ConcreteBlock};

        //                     let update_block = ConcreteBlock::new(move || -> () {
        //                         unsafe {
        //                             let layer: id = msg_send![view as id, layer];
        //                             let _: () = msg_send![layer, setCornerRadius: 20.0];
        //                             let _: () = msg_send![layer, setMasksToBounds: YES];

        //                             // Force layout update - using NSView methods
        //                             let _: () = msg_send![view as id, setNeedsDisplay: YES];

        //                             // Update the layer
        //                             let _: () = msg_send![layer, setNeedsDisplay];
        //                         }
        //                     });

        //                     let update_block = update_block.copy();

        //                     // Get the main dispatch queue and schedule the block
        //                     let main_queue: id = msg_send![class!(NSOperationQueue), mainQueue];
        //                     let _: () = msg_send![main_queue, addOperationWithBlock:update_block];
        //                 }

        //                 if panel.is_visible() {
        //                     panel.order_out(None);
        //                 } else {
        //                     //window.center_at_cursor_monitor().unwrap();

        //                     panel.show();

        //                     app.app_handle().emit("focus", ()).unwrap();
        //                 }
        //             } else if event.state == ShortcutState::Pressed
        //                 && shortcut.matches(Modifiers::empty(), Code::Escape)
        //             {
        //                 if panel.is_visible() {
        //                     panel.order_out(None);
        //                 }
        //             }
        //         })
        //         .build(),
        // )
        .manage(spotlight_utils::SpotlightState::new())
        .invoke_handler(tauri::generate_handler![
            theme_utils::set_vibrancy,
            theme_utils::set_appearance,
            icns_utils::load_app_info,
            icns_utils::load_extension_icons,
            spotlight_utils::search_spotlight_apps,
            toggle_visibility::toggle_visibility,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
