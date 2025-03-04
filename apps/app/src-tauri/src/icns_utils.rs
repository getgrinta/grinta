use std::collections::HashMap;
use std::fs::{self};
use std::io::BufWriter;
use std::path::{Path};
use tauri::{command, AppHandle, Manager, Runtime};
use base64::{Engine as _, engine::general_purpose};

#[cfg(target_os = "macos")]
use tauri_icns::{IconFamily, IconType};

// Function to load an ICNS file and convert it to PNG
#[cfg(target_os = "macos")]
fn load_icns_file(path: &Path) -> Result<Option<Vec<u8>>, String> {
    // Try to read the ICNS file
    let icns_data = match fs::read(path) {
        Ok(data) => data,
        Err(e) => return Err(format!("Failed to read ICNS file: {} for path {}", e, path.display())),
    };

    // Parse the ICNS data
    let icon_family = match IconFamily::read(&icns_data[..]) {
        Ok(family) => family,
        Err(e) => return Err(format!("Failed to parse ICNS data: {}", e)),
    };

    let icon_types = [IconType::RGBA32_512x512_2x, IconType::RGBA32_512x512, IconType::RGBA32_256x256_2x, IconType::RGBA32_256x256, IconType::RGBA32_128x128_2x, IconType::RGBA32_128x128, IconType::RGB24_128x128, IconType::RGBA32_64x64, IconType::RGBA32_32x32_2x, IconType::RGBA32_32x32, IconType::RGB24_48x48];

    // First try our preferred icon types
    for icon_type in icon_types {
        match icon_family.get_icon_with_type(icon_type) {
            Ok(image) => {
                // Create a buffer to hold the PNG data
                let mut png_data = Vec::new();
                let writer = BufWriter::new(&mut png_data);
                
                // Use the built-in write_png method
                if let Err(_e) = image.write_png(writer) {
                    // println!("Error writing PNG for icon type {:?}: {}", icon_type, e);
                    continue;
                }
                
                return Ok(Some(png_data));
            },
            Err(_e) => {
                // println!("Error extracting icon type {:?}: {}", icon_type, e);
                continue;
            }
        }
    }
    
    // If we couldn't get any of our preferred types, try to get any available icon type
   // println!("Trying fallback icon extraction for {}", path.display());
    
    // Get all available icon types in the family
    let available_types = icon_family.available_icons();
    if available_types.is_empty() {
        return Ok(None);
    }
    
    // Try each available type
    for icon_type in available_types {
        match icon_family.get_icon_with_type(icon_type) {
            Ok(image) => {
                // Create a buffer to hold the PNG data
                let mut png_data = Vec::new();
                let writer = BufWriter::new(&mut png_data);
                
                // Use the built-in write_png method
                if let Err(_e) = image.write_png(writer) {
                    // println!("Error writing PNG for fallback icon type {:?}: {}", icon_type, e);
                    continue;
                }
                
                return Ok(Some(png_data));
            },
            Err(_e) => {
                // println!("Error extracting fallback icon type {:?}: {}", icon_type, e);
                continue;
            }
        }
    }
    
    // No suitable icon found
    Ok(None)
}

#[command]
#[cfg(target_os = "macos")]
pub fn load_app_icons<R: Runtime>(_app_handle: AppHandle<R>, resources_paths: Vec<String>) -> Result<HashMap<String, String>, String> {
    let mut result = HashMap::new();
    
    for resources_path in resources_paths {
        let resources_dir = Path::new(&resources_path);
        
        // Skip if the directory doesn't exist
        if !resources_dir.exists() || !resources_dir.is_dir() {
            continue;
        }
        
        // Get app name from path (parent directory of Resources)
        let app_name = resources_dir.parent() // This gets "Contents"
            .and_then(|p| p.parent()) // This gets "App.app"
            .and_then(|p| p.file_name())
            .and_then(|s| s.to_str())
            .unwrap_or("unknown")
            .replace(".app", "");
        
        // Find the first .icns file in the directory
        let mut icns_path = None;
        
        if let Ok(entries) = fs::read_dir(resources_dir) {
            for entry in entries.filter_map(Result::ok) {
                let path = entry.path();
                if path.is_file() && 
                   path.extension().map_or(false, |ext| ext == "icns") {
                    icns_path = Some(path);
                    break;
                }
            }
        }

        // Skip if no .icns file found
        let icns_path = match icns_path {
            Some(path) => {
                // println!("Found .icns file: {} for path {}", path.display(), resources_path);
                path
            },
            None => {
                // println!("No .icns file found for path {}", resources_path);
                continue;
            },
        };
        
        // Load and convert ICNS to PNG
        match load_icns_file(&icns_path) {
            Ok(Some(png_data)) => {
                // Convert PNG data to base64
                let base64_png = general_purpose::STANDARD.encode(&png_data);
                let data_url = format!("data:image/png;base64,{}", base64_png);
                
                // Add to result with base64 data URL
                result.insert(
                    app_name.to_string(),
                    data_url,
                );
            },
            Ok(None) => {
                // No suitable icon found, skip
                continue;
            },
            Err(_e) => {
                // Log error but continue with other icons
                continue;
            }
        }
    }

    Ok(result)
}

// Command to get the path to the icons directory
#[command]
#[cfg(target_os = "macos")]
pub fn get_icons_directory<R: Runtime>(app_handle: AppHandle<R>) -> Result<String, String> {
    // Get app data directory
    let app_data_dir = get_app_data_dir(app_handle)?;
    let icons_dir = format!("{}/icons", app_data_dir);
    
    let icons_dir_path = Path::new(&icons_dir);
    
    // Create icons directory if it doesn't exist
    if !icons_dir_path.exists() {
        fs::create_dir_all(icons_dir_path).map_err(|e| format!("Failed to create icons directory: {}", e))?;
    }
    
    Ok(icons_dir)
}

// Fallback implementations for non-macOS platforms
#[command]
#[cfg(not(target_os = "macos"))]
pub fn load_app_icons<R: Runtime>(_app_handle: AppHandle<R>, _icns_paths: Vec<String>) -> Result<HashMap<String, String>, String> {
    Ok(HashMap::new())
}

#[command]
#[cfg(not(target_os = "macos"))]
pub fn get_icons_directory<R: Runtime>(_app_handle: AppHandle<R>) -> Result<String, String> {
    Err("Not implemented on this platform".to_string())
}

#[tauri::command]
fn get_app_data_dir<R: Runtime>(app_handle: tauri::AppHandle<R>) -> Result<String, String> {
    app_handle.path().app_config_dir()
        .map(|path| path.to_string_lossy().to_string())
        .map_err(|err| format!("App data directory not configured: {}", err))
}
