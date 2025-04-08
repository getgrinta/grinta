use tauri::{command, AppHandle, Runtime};
use favicon_picker::get_default_favicon_url;
use tauri_plugin_http::reqwest::{self, Client};
use favicon_picker::get_favicons_from_url;
use url::Url;

#[command]
pub async fn fetch_favicon<R: Runtime>(
    _app_handle: AppHandle<R>,
    url: String,
) -> Result<String, String> {
    let base_url = Url::parse(&url).map_err(|e| e.to_string())?;
    let client = Client::new();

    match get_favicons_from_url(&client, &base_url).await {
        Ok(favicons) => {
            if let Some(first_icon) = favicons.first() {
                let icon_url = first_icon.href.clone();
                Ok(icon_url.to_string())
            } else {
                if let Ok(icon_url) = get_default_favicon_url(&base_url) {
                    Ok(icon_url.to_string())
                } else {
                    Err("Failed to find any favicon for the given URL".to_string())
                }
            }
        },
        Err(e) => {
            if let Ok(icon_url) = get_default_favicon_url(&base_url) {
                Ok(icon_url.to_string())
            } else {
                Err("Failed to find any favicon for the given URL".to_string())
            }
        }
    }
}
