# Grinta

<p align="center">
  <img src="./apps/website/public/pro.svg" alt="Grinta" width="128">
</p>

Grinta is an open-source, AI-powered, and privacy-focused alternative to MacOS Spotlight and RayCast. It combines powerful search capabilities, productivity tools, and AI-driven features while ensuring your data stays private.

### Features

- **LLM Powers**: Use the powers of our hosted LLMs to boost your productivity.
- **Calendar Integration**: Connect your macOS Calendar to view and manage upcoming events directly in Grinta.
- **Quick Search**: Use shortcuts (e.g., `G` + Tab) to instantly search specific websites like Google, YouTube, Wikipedia, Reddit, and your own custom quick links directly from the search bar.
- **Shortcuts Integration**: Seamlessly access and execute your existing Shortcuts directly within Grinta.
- **Notes Mode**: Write notes with the help of an AI copilot. Improve readability with rephrasing tools and open your Grinta notes as Obsidian vaults for enhanced organization.
- **Formulas and Natural Language Processing (NLP)**: Use the search bar as a calculator or process natural language queries like "45 days from now".
- **Keyboard First**: Grinta is designed to be keyboard-centric, ensuring you can easily operate without relying on mouse or touch.
- **Clipboard History**: Keep track of your clipboard history and quickly access previously copied items.
- **Multi-language Support**: Enjoy Grinta in your preferred language with support for English, Polish, and German translations throughout the interface.
- **Customizable Theme**: Choose between a light and dark mode, as well as a variety of color schemes to suit your style.
- **Search Mode**: Quickly find installed apps, perform web searches, and more. All from a single search bar.


### Installation

1. Download the [latest release](https://github.com/getgrinta/grinta/releases/latest).
2. Run the app to get started.

### Roadmap

- [ ] **GrintaFI**: AI-driven insights for quick access to stock and cryptocurrency data.
- [x] **Grinta Pro**: Unlock unlimited AI capabilities and premium features with a subscription plan.
- [ ] **Grinta iOS**: A mobile version of Grinta for iOS with iCloud or alternative syncing options.
- [ ] **Multiplatform**: Support for other platforms like Linux and Windows.

Grinta is designed to enhance your productivity while respecting your privacy. Try it today!

## Development

### Prerequisite

- [Bun](https://bun.sh)
- [Rust](https://www.rust-lang.org/)
- [Xcode](https://developer.apple.com/xcode/) and Xcode CLI (macOS only)

### Setup

1. Install dependencies

```sh
$ bun install
```

2. Copy and adjust `.env` files.

```sh
$ cp apps/api/.env.example apps/api/.env
$ cp apps/app/.env.example apps/app/.env
```

3. Build dependencies and API types for RPC

```sh
$ bun run build:deps
```

4. Start dev instance of Grinta

```sh
# /apps/app
$ bun run tauri dev
```

### Project Structure

```
├── apps
│   ├── api - Hono based API server
│   ├── app - Tauri and Svelte based desktop app
│   └── website - Astro and Svelte based website
├── packages
│   ├── core - Core library for Grinta
<<<<<<< HEAD
│   └── plugin - Plugin interface for Grinta
=======
│   └── plugin - Plugin interface for Grinta
```
>>>>>>> origin/main
