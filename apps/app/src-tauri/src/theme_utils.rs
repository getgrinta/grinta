use tauri::Manager;
use tauri::command;
use window_vibrancy::*;

#[command]
#[cfg(target_os = "macos")]
#[allow(deprecated)]
pub fn set_vibrancy(app_handle: tauri::AppHandle, material_name: String) -> Result<String, String> {
    let window = app_handle
        .get_webview_window("main")
        .ok_or("Window not found")?;

    // Map the string to the appropriate material
    let material = match material_name.as_str() {
        "dark" => NSVisualEffectMaterial::Dark,
        "light" => NSVisualEffectMaterial::Light,
        "appearance_based" => NSVisualEffectMaterial::AppearanceBased,
        "titlebar" => NSVisualEffectMaterial::Titlebar,
        "selection" => NSVisualEffectMaterial::Selection,
        "menu" => NSVisualEffectMaterial::Menu,
        "popover" => NSVisualEffectMaterial::Popover,
        "sidebar" => NSVisualEffectMaterial::Sidebar,
        "medium_light" => NSVisualEffectMaterial::MediumLight,
        "ultra_dark" => NSVisualEffectMaterial::UltraDark,
        "hud_window" => NSVisualEffectMaterial::HudWindow,
        _ => NSVisualEffectMaterial::Dark, // Default to Dark
    };

    // Clear any existing vibrancy
    if let Err(e) = clear_vibrancy(&window) {
        return Err(format!("Failed to clear vibrancy: {}", e));
    }

    // Apply new vibrancy
    match apply_vibrancy(&window, material, None, None) {
        Ok(_) => Ok("OK set vibrancy".into()),
        Err(e) => Err(format!("Failed to apply vibrancy: {}", e)),
    }
}

#[command]
#[cfg(target_os = "macos")]
pub fn set_appearance(app_handle: tauri::AppHandle, appearance: String) -> Result<String, String> {
    let window = app_handle
        .get_webview_window("main")
        .ok_or("Window not found")?;

    if let Ok(ns_window_ptr) = window.ns_window() {
        // Map the string to the appropriate appearance
        let appearance_value = match appearance.as_str() {
            "dark" => "darkAqua",
            "light" => "aqua",
            _ => "darkAqua", // Default to dark
        };

        unsafe {
            use cocoa::base::{id, nil};
            use cocoa::foundation::NSString;
            use objc::{class, msg_send, sel, sel_impl};

            // Cast the raw pointer to id type
            let ns_window: id = ns_window_ptr as id;

            let appearance_class = class!(NSAppearance);
            let appearance_name = NSString::alloc(nil).init_str(appearance_value);
            let ns_appearance: id = msg_send![appearance_class, appearanceNamed: appearance_name];

            let _: () = msg_send![ns_window, setAppearance: ns_appearance];

            // Also set it on the content view
            let content_view: id = msg_send![ns_window, contentView];
            if content_view != nil {
                let _: () = msg_send![content_view, setAppearance: ns_appearance];
            }
        }

        Ok("OK set appearance".into())
    } else {
        Err("Failed to get window handle".into())
    }
}
