use keyring::Entry;
use tauri::command;

fn handle_keyring_error<T>(result: keyring::Result<T>, action: &str) -> Result<T, String> {
    result.map_err(|e| format!("Keyring {} error: {}", action, e))
}

#[command]
pub fn set_secret(service_name: String, account_name: String, secret: String) -> Result<(), String> {
    let entry = Entry::new(&service_name, &account_name).map_err(|e| format!("Keyring set error: {}", e))?;
    handle_keyring_error(entry.set_password(&secret), "set")
}

#[command]
pub fn get_secret(service_name: String, account_name: String) -> Result<String, String> {
    let entry = Entry::new(&service_name, &account_name)
        .map_err(|e| format!("Keyring get error (entry): {}", e))?;
    handle_keyring_error(entry.get_password(), "get")
}

#[command]
pub fn delete_secret(service_name: String, account_name: String) -> Result<(), String> {
    let entry = Entry::new(&service_name, &account_name)
        .map_err(|e| format!("Keyring delete error (entry): {}", e))?;
    handle_keyring_error(entry.delete_credential(), "delete")
}
