use tauri::{command};
use favicon_picker::get_default_favicon_url;
use url::Url;

// Define the error type for the command
#[derive(Debug, serde::Serialize)]
pub struct FetchError {
    message: String,
}

// The Tauri command to fetch the favicon
#[command]
pub async fn fetch_favicon(url: String) -> Result<String, FetchError> {
    match Url::parse(&url) { 
        Ok(base_url) => {
            match get_default_favicon_url(&base_url) { 
                Ok(icon) => {
                    Ok(icon.to_string())
                },
                Err(e) => {
                    Err(FetchError { message: e.to_string() })
                }
            }
        },
        Err(e) => {
            Err(FetchError { message: e.to_string() })
        }
    }
}
