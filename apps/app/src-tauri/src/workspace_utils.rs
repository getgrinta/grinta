use std::sync::Mutex;
use tauri::{command, State};

#[allow(non_snake_case)]
#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct RunningAppInfo {
    pub bundle_identifier: String,
    pub localized_name: String,
    pub is_active: bool,
    pub is_hidden: bool,
}

// State to store running applications
pub struct WorkspaceState {
    running_apps: Mutex<Vec<RunningAppInfo>>,
}

impl WorkspaceState {
    pub fn new() -> Self {
        Self {
            running_apps: Mutex::new(Vec::new()),
        }
    }
}

#[cfg(target_os = "macos")]
#[command]
pub fn activate_application_by_name(
    state: State<'_, WorkspaceState>,
    app_name: String,
) -> Result<bool, String> {
    use cocoa::base::{id, nil};
    
    use objc::{class, msg_send, sel, sel_impl};

    unsafe {
        // Create an autorelease pool
        let pool: id = msg_send![class!(NSAutoreleasePool), new];

        // Get the shared workspace
        let workspace: id = msg_send![class!(NSWorkspace), sharedWorkspace];
        
        // Get running applications
        let running_apps: id = msg_send![workspace, runningApplications];
        let count: usize = msg_send![running_apps, count];
        
        // Find and activate the app
        let mut activated = false;
        
        for i in 0..count {
            let app: id = msg_send![running_apps, objectAtIndex: i];
            let name: id = msg_send![app, localizedName];
            
            if name != nil {
                let name_str: *const i8 = msg_send![name, UTF8String];
                let localized_name = std::ffi::CStr::from_ptr(name_str)
                    .to_string_lossy()
                    .into_owned();
                
                if localized_name == app_name {
                    // Activate the app
                    let options = 0; // NSApplicationActivateIgnoringOtherApps = 1 << 0
                    let success: bool = msg_send![app, activateWithOptions: options];
                    
                    activated = success;
                    break;
                }
            }
        }
        
        // Release the pool
        let _: () = msg_send![pool, drain];
        
        if activated {
            Ok(true)
        } else {
            Err(format!("Application '{}' not found or could not be activated", app_name))
        }
    }
}

#[cfg(not(target_os = "macos"))]
#[command]
pub fn activate_application_by_name(
    _state: State<'_, WorkspaceState>,
    _app_name: String,
) -> Result<bool, String> {
    Err("Activating applications is only available on macOS".to_string())
}

#[cfg(target_os = "macos")]
#[command]
pub fn get_frontmost_application_name() -> Result<String, String> {
    use cocoa::base::{id, nil};
    use objc::{class, msg_send, sel, sel_impl};

    unsafe {
        // Create an autorelease pool
        let pool: id = msg_send![class!(NSAutoreleasePool), new];

        // Get the shared workspace
        let workspace: id = msg_send![class!(NSWorkspace), sharedWorkspace];
        
        // Get the frontmost application
        let frontmost_app: id = msg_send![workspace, frontmostApplication];
        
        if frontmost_app == nil {
            let _: () = msg_send![pool, drain];
            return Err("No frontmost application found".to_string());
        }
        
        // Get the localized name of the frontmost application
        let name: id = msg_send![frontmost_app, localizedName];
        
        if name == nil {
            let _: () = msg_send![pool, drain];
            return Err("Could not get name of frontmost application".to_string());
        }
        
        // Convert the name to a Rust string
        let name_str: *const i8 = msg_send![name, UTF8String];
        let localized_name = std::ffi::CStr::from_ptr(name_str)
            .to_string_lossy()
            .into_owned();
        
        // Release the pool
        let _: () = msg_send![pool, drain];
        
        Ok(localized_name)
    }
}

#[cfg(not(target_os = "macos"))]
#[command]
pub fn get_frontmost_application_name() -> Result<String, String> {
    Err("Getting frontmost application name is only available on macOS".to_string())
}
