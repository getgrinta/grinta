use base64::{engine::general_purpose, Engine as _};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::{self, File};
use std::io::BufWriter;
use std::path::{Path, PathBuf};
use tauri::path::PathResolver;
use tauri::{command, AppHandle, Manager, Runtime};

#[cfg(target_os = "macos")]
use tauri_icns::{IconFamily, IconType};

// Function to load an ICNS file and convert it to PNG
#[cfg(target_os = "macos")]
fn load_icns_file(path: &Path) -> Result<Option<Vec<u8>>, String> {
    // Try to read the ICNS file
    let icns_data = match fs::read(path) {
        Ok(data) => data,
        Err(e) => {
            return Err(format!(
                "Failed to read ICNS file: {} for path {}",
                e,
                path.display()
            ))
        }
    };

    // Parse the ICNS data
    let icon_family = match IconFamily::read(&icns_data[..]) {
        Ok(family) => family,
        Err(e) => return Err(format!("Failed to parse ICNS data: {}", e)),
    };

    // Try to get the largest icon (preferably 256x256 or 128x128)
    let icon_types = [
        IconType::RGBA32_512x512,
        IconType::RGBA32_256x256,
        IconType::RGBA32_128x128,
        IconType::RGB24_128x128,
        IconType::RGBA32_512x512_2x,
        IconType::RGBA32_256x256_2x,
        IconType::RGBA32_128x128_2x,
        IconType::RGBA32_64x64,
        IconType::RGBA32_32x32,
    ];

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
            }
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
            }
            Err(_e) => {
                // println!("Error extracting fallback icon type {:?}: {}", icon_type, e);
                continue;
            }
        }
    }

    // No suitable icon found
    Ok(None)
}

// Define a struct to hold app information
#[derive(serde::Serialize, serde::Deserialize)]
#[cfg(target_os = "macos")]
pub struct AppInfo {
    pub base64Image: String,
    pub localizedName: String,
}

#[command]
#[cfg(target_os = "macos")]
pub fn load_app_icons<R: Runtime>(
    _app_handle: AppHandle<R>,
    resources_paths: Vec<String>,
) -> Result<HashMap<String, AppInfo>, String> {
    let mut result = HashMap::new();
    let mut app_paths = Vec::new();
    let mut app_names = HashMap::new();
    let mut icns_paths = HashMap::new();

    for resources_path in resources_paths {
        let resources_dir = Path::new(&resources_path);

        if !resources_dir.exists() || !resources_dir.is_dir() {
            continue;
        }

        // Get app path (parent directory of Resources/Contents
        let app_path = resources_dir
            .parent() // This gets "Contents"
            .and_then(|p| p.parent()); // This gets "App.app"

        // Skip if we can't get the app path
        let app_path = match app_path {
            Some(path) => path,
            None => continue,
        };

        // Get app name from path
        let app_name = app_path
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or("unknown")
            .replace(".app", "");

        // Find the first .icns file in the directory
        let mut icns_path = None;

        if let Ok(entries) = fs::read_dir(resources_dir) {
            for entry in entries.filter_map(Result::ok) {
                let path = entry.path();
                if path.is_file() && path.extension().map_or(false, |ext| ext == "icns") {
                    icns_path = Some(path);
                    break;
                }
            }
        }

        let app_path_str = app_path.to_string_lossy().to_string();
        app_paths.push(app_path_str.clone());
        app_names.insert(app_path_str.clone(), app_name);

        if let Some(path) = icns_path {
            icns_paths.insert(app_path_str, path);
        }
    }

    // Get all localized names at once using mdls
    let localized_names = get_localized_app_names(&app_paths);

    for app_path_str in app_paths {
        let app_name = match app_names.get(&app_path_str) {
            Some(name) => name.clone(),
            None => continue,
        };

        // Get the localized name or fall back to app name
        let localized_name = localized_names
            .get(&app_path_str)
            .cloned()
            .unwrap_or_else(|| app_name.clone());

        // Check if we have an icon path for this app
        if let Some(icns_path) = icns_paths.get(&app_path_str) {
            // Load and convert ICNS to PNG
            match load_icns_file(icns_path) {
                Ok(Some(png_data)) => {
                    // Convert PNG data to base64
                    let base64_png = general_purpose::STANDARD.encode(&png_data);
                    let data_url = format!("data:image/png;base64,{}", base64_png);

                    let app_info = AppInfo {
                        base64Image: data_url,
                        localizedName: localized_name,
                    };

                    result.insert(app_name, app_info);
                }
                Ok(None) => {
                    // No suitable icon found, create AppInfo with empty image
                    let app_info = AppInfo {
                        base64Image: String::new(),
                        localizedName: localized_name.clone(),
                    };
                    result.insert(app_name, app_info);
                }
                Err(_) => {
                    let app_info = AppInfo {
                        base64Image: String::new(),
                        localizedName: localized_name.clone(),
                    };
                    result.insert(app_name, app_info);
                }
            }
        } else {
            // No icon path, create AppInfo with empty image
            let app_info = AppInfo {
                base64Image: String::new(),
                localizedName: localized_name,
            };
            result.insert(app_name, app_info);
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
        fs::create_dir_all(icons_dir_path)
            .map_err(|e| format!("Failed to create icons directory: {}", e))?;
    }

    Ok(icons_dir)
}

// Define a struct to hold app information for non-macOS platforms
#[derive(serde::Serialize, serde::Deserialize)]
#[cfg(not(target_os = "macos"))]
pub struct AppInfo {
    pub base64Image: String,
    pub localizedName: String,
}

// Function to get localized app names using mdls
#[cfg(target_os = "macos")]
fn get_localized_app_names(app_paths: &[String]) -> HashMap<String, String> {
    let mut localized_names = HashMap::new();

    if app_paths.is_empty() {
        return localized_names;
    }

    // Build the mdls command with all app paths
    let mut command = std::process::Command::new("mdls");
    command.arg("-name").arg("kMDItemDisplayName");

    // Add all app paths to the command
    for path in app_paths {
        command.arg(path);
    }

    // Execute the command
    if let Ok(output) = command.output() {
        if output.status.success() {
            let output_str = String::from_utf8_lossy(&output.stdout);
            let lines: Vec<&str> = output_str.lines().collect();

            // Process the output lines
            let mut current_app_index = 0;
            for line in lines {
                const PREFIX: &str = "kMDItemDisplayName = \"";
                if !line.starts_with(PREFIX) {
                    continue;
                }
                
                let name = &line[PREFIX.len()..line.len()-1];
                
                if current_app_index < app_paths.len() {
                    localized_names.insert(app_paths[current_app_index].clone(), name.to_string());
                }
    
                current_app_index += 1;
            }
        }
    }

    localized_names
}

// Fallback implementations for non-macOS platforms
#[command]
#[cfg(not(target_os = "macos"))]
pub fn load_app_icons<R: Runtime>(
    _app_handle: AppHandle<R>,
    _icns_paths: Vec<String>,
) -> Result<HashMap<String, AppInfo>, String> {
    Ok(HashMap::new())
}

#[command]
#[cfg(not(target_os = "macos"))]
pub fn get_icons_directory<R: Runtime>(_app_handle: AppHandle<R>) -> Result<String, String> {
    Err("Not implemented on this platform".to_string())
}

#[tauri::command]
fn get_app_data_dir<R: Runtime>(app_handle: tauri::AppHandle<R>) -> Result<String, String> {
    app_handle
        .path()
        .app_config_dir()
        .map(|path| path.to_string_lossy().to_string())
        .map_err(|err| format!("App data directory not configured: {}", err))
}
