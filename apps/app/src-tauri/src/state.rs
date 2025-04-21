// src-tauri/src/state.rs

use std::sync::Mutex;
use objc::runtime::Object;
use objc_id;

pub struct CalendarState {
    // Wrap the Id in a Mutex to ensure Send + Sync
    pub event_store: Mutex<objc_id::Id<Object>>,
}
