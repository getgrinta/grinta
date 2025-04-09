use favicon_picker::{get_default_favicon_url, get_favicons_from_url};
use tauri::{command, AppHandle, Runtime};
use tauri_plugin_http::reqwest::{header::{HeaderMap, USER_AGENT, ACCEPT, ACCEPT_LANGUAGE}, Client};
use url::Url;

async fn try_fetch_favicon_from_url(
    client: &Client,
    target_url: &Url,
) -> Result<String, String> {
    match get_favicons_from_url(client, target_url).await {
        Ok(favicons) => {
            if let Some(first_icon) = favicons.first() {
                Ok(first_icon.href.to_string())
            } else {
                // Crate succeeded but found no icons (should include default check)
                let err_msg = format!("No icons found by crate for {}", target_url);
                Err(err_msg)
            }
        }
        Err(e) => {
            // Convert non-Send error to String immediately
            let err_msg = format!("get_favicons_from_url failed for {}: {}", target_url, e);
            Err(err_msg)
        }
    }
}

#[command]
pub async fn fetch_favicon<R: Runtime>(
    _app_handle: AppHandle<R>,
    url: String,
) -> Result<String, String> {
    let base_url = Url::parse(&url).map_err(|e| format!("Initial URL parse failed: {}", e))?;
    
    // Artificial headers
    let mut headers = HeaderMap::new();
    headers.insert(USER_AGENT, "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36".parse().unwrap());
    headers.insert(ACCEPT, "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7".parse().unwrap());
    headers.insert(ACCEPT_LANGUAGE, "pl,de;q=0.9,en-GB;q=0.8,en-US;q=0.7,en;q=0.6,de-DE;q=0.5".parse().unwrap());
    headers.insert("sec-ch-ua", "\"Chromium\";v=\"135\", \"Not-A.Brand\";v=\"8\"".parse().unwrap());
    headers.insert("sec-ch-ua-mobile", "?0".parse().unwrap());
    headers.insert("sec-ch-ua-platform", "\"macOS\"".parse().unwrap());
    headers.insert("sec-fetch-dest", "document".parse().unwrap());
    headers.insert("sec-fetch-mode", "navigate".parse().unwrap());
    headers.insert("sec-fetch-site", "none".parse().unwrap());
    headers.insert("sec-fetch-user", "?1".parse().unwrap());
    headers.insert("dnt", "1".parse().unwrap());
    headers.insert("upgrade-insecure-requests", "1".parse().unwrap());
    headers.insert("priority", "u=0, i".parse().unwrap());

    // Build the client with default headers and timeout
    let client = Client::builder()
        .default_headers(headers)
        .timeout(std::time::Duration::from_secs(2))
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))?;

    // 1. Try the original URL
    match try_fetch_favicon_from_url(&client, &base_url).await {
        Ok(icon_url) => {
            return Ok(icon_url); // Early return on success
        }
        Err(initial_error_string) => {
            // 2. Construct potential www URL
            let mut www_url_option: Option<Url> = None;
            if let Some(host) = base_url.host_str() {
                if !host.starts_with("www.") {
                    // Try to construct www url carefully
                    let scheme = base_url.scheme();
                    let new_host = format!("www.{}", host);
                    let port = base_url.port_or_known_default();
                    let path = base_url.path();
                    let query = base_url.query();
                    let fragment = base_url.fragment();

                    let mut www_url_str = format!("{}://{}", scheme, new_host);
                    if let Some(p) = port {
                         www_url_str.push_str(&format!(":{}", p));
                    }
                    www_url_str.push_str(path);
                     if let Some(q) = query {
                         www_url_str.push_str(&format!("?{}", q));
                     }
                     if let Some(f) = fragment {
                         www_url_str.push_str(&format!("#{}", f));
                     }

                     match Url::parse(&www_url_str) {
                        Ok(parsed_www_url) => www_url_option = Some(parsed_www_url),
                        Err(e) => println!("Failed to construct www URL: {}", e),
                     }
                }
            }

            // 3. Try www URL if constructed
            if let Some(www_url) = www_url_option {
                match try_fetch_favicon_from_url(&client, &www_url).await {
                    Ok(icon_url) => {
                        return Ok(icon_url); // Early return on www success
                    }
                    Err(_www_error_string) => {  
                        return Ok(format!("{}/favicon.ico", www_url.as_str()));
                    }
                }
            } else {
                 // Proceed to final fallback
            }

            // 4. Final Fallback: Try default favicon path for the *original* base URL
            if let Ok(default_icon_url) = get_default_favicon_url(&base_url) {
                Ok(default_icon_url.to_string())
            } else {
                let final_err_msg = format!("All attempts failed for {}: initial error ({}), www attempt failed or was skipped, and default icon path check failed.", base_url, initial_error_string);
                Err(final_err_msg)
            }
        }
    }
}
