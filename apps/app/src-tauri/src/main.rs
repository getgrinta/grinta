// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod spotlight_utils;
mod workspace_utils;

fn main() {
    let _ = fix_path_env::fix();
    grinta_lib::run();
}
