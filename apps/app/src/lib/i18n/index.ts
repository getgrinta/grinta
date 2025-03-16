import { browser } from "$app/environment";
import { _, dictionary, init, locale, register } from "svelte-i18n";

// Register locales
const locales = {
	en: () => import("./locales/en.json"),
	pl: () => import("./locales/pl.json"),
	de: () => import("./locales/de.json"),
};

// Initialize i18n
export async function setupI18n() {
	// Register all locales
	for (const [locale, loader] of Object.entries(locales)) {
		register(locale, loader);
	}

	// Initialize with browser language or default to English
	await init({
		fallbackLocale: "en",
		initialLocale: browser ? window.navigator.language.split("-")[0] : "en",
	});
}

// Export for convenience
export { _, dictionary, locale };
