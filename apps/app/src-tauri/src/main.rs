// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod spotlight_utils;

fn main() {
    // Initialize the spotlight state
    let spotlight_state = spotlight_utils::SpotlightState::new();
    grinta_lib::run();
}
