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
