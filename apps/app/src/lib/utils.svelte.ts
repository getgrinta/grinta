import { useEventListener } from "runed";
import { onMount } from "svelte";
import { settingsStore } from "./store/settings.svelte";

const THEME_QUERY = "(prefers-color-scheme: dark)";

const THEME = {
	DARK: "DARK",
	LIGHT: "LIGHT",
} as const;

type Theme = keyof typeof THEME;

export class SystemThemeWatcher {
	systemTheme = $state<Theme>();
	theme = $derived(
		settingsStore.settings.theme === "SYSTEM"
			? (this.systemTheme ?? "DARK")
			: settingsStore.settings.theme,
	);

	initialize() {
		onMount(() => {
			this.setInitialSystemTheme();
			useEventListener(
				() => window.matchMedia(THEME_QUERY),
				"change",
				this.handleSystemThemeChange,
			);
		});
	}

	setInitialSystemTheme() {
		this.systemTheme = window?.matchMedia?.(THEME_QUERY)?.matches
			? THEME.DARK
			: THEME.LIGHT;
	}

	handleSystemThemeChange(event: MediaQueryListEvent) {
		this.systemTheme = event.matches ? THEME.DARK : THEME.LIGHT;
	}
}

export const systemThemeWatcher = new SystemThemeWatcher();
