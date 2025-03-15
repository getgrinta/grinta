use tauri_plugin_autostart::MacosLauncher;

mod icns_utils;
mod spotlight_utils;
mod theme_utils;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
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
        .manage(spotlight_utils::SpotlightState::new())
        .invoke_handler(tauri::generate_handler![
            theme_utils::set_vibrancy,
            theme_utils::set_appearance,
            icns_utils::load_app_info,
            spotlight_utils::search_spotlight_apps,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
