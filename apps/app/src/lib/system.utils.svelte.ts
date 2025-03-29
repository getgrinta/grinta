import { Command } from "@tauri-apps/plugin-shell";
import { settingsStore } from "./store/settings.svelte";

const THEME_QUERY = "(prefers-color-scheme: dark)";

const THEME = {
	DARK: "DARK",
	LIGHT: "LIGHT",
} as const;

type Theme = keyof typeof THEME;

export class SystemThemeWatcher {
	systemTheme = $state<Theme>();
	themeChangeInterval = $state<number | NodeJS.Timeout>();
	media = $derived(window.matchMedia(THEME_QUERY));

	theme = $derived(
		settingsStore.data.theme === "SYSTEM"
			? (this.systemTheme ?? "DARK")
			: settingsStore.data.theme,
	);

	constructor() {
		this.getSystemTheme();
	}

	getSystemTheme() {
		this.systemTheme = this.media.matches ? THEME.DARK : THEME.LIGHT;
	}

	addEventListner() {
		this.themeChangeInterval = setInterval(() => {
			this.getSystemTheme();
		}, 1000);
	}

	removeEventListner() {
		clearInterval(this.themeChangeInterval);
	}
}

export const systemThemeWatcher = new SystemThemeWatcher();

export async function getLastFocusedWindowName() {
	const lastApp = await Command.create("osascript", [
		"-e",
		'tell application "System Events" to get name of first application process whose frontmost is true',
	]).execute();
	// If app name is Electron, it's likely a generic name for an Electron-based app
	// Try to get the actual app name from the window title
	const lastAppName = lastApp.stdout.trim();
	if (lastAppName !== "Electron") return lastAppName;
	const windowTitle = await Command.create("osascript", [
		"-e",
		'tell application "System Events" to get name of front window of first application process whose frontmost is true',
	]).execute();
	if (!windowTitle.stderr && windowTitle.stdout.trim()) {
		return windowTitle.stdout.trim();
	}
	return "";
}

export async function focusOnWindow(windowName: string) {
	const result = await Command.create("osascript", [
		"-e",
		`tell application "${windowName}" to activate`,
	]).execute();
	if (result.stderr) throw new Error(result.stderr);
	return result.stdout;
}
