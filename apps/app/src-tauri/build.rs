fn main() {
    println!("cargo:rustc-link-lib=framework=EventKit");

    tauri_build::build()
}
