import { browser } from "$app/environment";
import {
	type ShortcutEvent,
	register,
	unregisterAll,
} from "@tauri-apps/plugin-global-shortcut";
import { match } from "ts-pattern";
import { z } from "zod";
import { activateWindow } from "../utils.svelte";
import { SEARCH_MODE, appStore } from "./app.svelte";
import { commandsStore } from "./commands.svelte";
import { notesStore } from "./notes.svelte";
import { SecureStore } from "./secure.svelte";

export const THEME = {
	SYSTEM: "SYSTEM",
	DARK: "DARK",
	LIGHT: "LIGHT",
} as const;

export type Theme = keyof typeof THEME;

export const SEARCH_ENGINE = {
	STARTPAGE: "STARTPAGE",
	GOOGLE: "GOOGLE",
	DUCKDUCKGO: "DUCKDUCKGO",
} as const;

export const SEARCH_ENGINE_STYLED = {
	[SEARCH_ENGINE.STARTPAGE]: "Startpage",
	[SEARCH_ENGINE.GOOGLE]: "Google",
	[SEARCH_ENGINE.DUCKDUCKGO]: "DuckDuckGo",
} as const

export const ACCENT_COLOR = {
	MARE: "MARE",
	IRIS: "IRIS",
	FOAM: "FOAM",
} as const;

export type AccentColor = keyof typeof ACCENT_COLOR;

export const LANGUAGE = {
	EN: "en",
	PL: "pl",
	DE: "de",
} as const;

// Create a reverse mapping from language code to enum key
const LANGUAGE_CODE_TO_ENUM = Object.entries(LANGUAGE).reduce(
	(acc, [key, value]) => {
		acc[value] = key as keyof typeof LANGUAGE;
		return acc;
	},
	{} as Record<string, keyof typeof LANGUAGE>,
);

export type Language = (typeof LANGUAGE)[keyof typeof LANGUAGE];

export const LANGUAGE_NATIVE_NAME = {
	[LANGUAGE.EN]: "English",
	[LANGUAGE.PL]: "Polski",
	[LANGUAGE.DE]: "Deutsch",
} as const

export const BASE_CURRENCY = {
	EUR: "EUR",
	PLN: "PLN",
	CHF: "CHF",
	GBP: "GBP",
	USD: "USD",
} as const;

export type BaseCurrency = keyof typeof BASE_CURRENCY;

export const baseCurrencies = Object.keys(BASE_CURRENCY);

// Get browser language or default to English
const getBrowserLanguage = (): Language => {
	if (!browser) return LANGUAGE.EN;

	const browserLang = window.navigator.language.split("-")[0];

	const enumKey = LANGUAGE_CODE_TO_ENUM[browserLang];
	return enumKey ? LANGUAGE[enumKey] : LANGUAGE.EN;
};

export const SettingsSchema = z.object({
	onboardingCompleted: z.boolean().default(false),
	toggleShortcut: z.string().default("CommandOrControl+Space"),
	theme: z.nativeEnum(THEME).default(THEME.SYSTEM),
	accentColor: z.nativeEnum(ACCENT_COLOR).default(ACCENT_COLOR.MARE),
	language: z.nativeEnum(LANGUAGE).default(getBrowserLanguage()),
	defaultSearchEngine: z
		.nativeEnum(SEARCH_ENGINE)
		.default(SEARCH_ENGINE.STARTPAGE),
	notesDir: z.array(z.string()).default(["Grinta", "notes"]),
	proAutocompleteEnabled: z.boolean().default(true),
	incognitoEnabled: z.boolean().default(false),
	baseCurrency: z.nativeEnum(BASE_CURRENCY).default(BASE_CURRENCY.USD),
});

export type Settings = z.infer<typeof SettingsSchema>;

async function toggleShortcutHandler(event: ShortcutEvent) {
	if (!appStore.appWindow) return;
	if (event.state !== "Pressed") return;
	const visible = await appStore.appWindow.isVisible();
	if (!visible) {
		await activateWindow();
		const searchBar = document.getElementById("search-bar");
		return searchBar?.focus();
	}
	return appStore.appWindow.hide();
}

export class SettingsStore extends SecureStore<Settings> {
	async initialize() {
		await this.restore();
		await this.registerShortcuts();
	}

	async registerShortcuts() {
		await register(this.data.toggleShortcut, toggleShortcutHandler);
	}

	async unregisterShortcuts() {
		await unregisterAll();
	}

	toggleIncognito() {
		this.updateData({ incognitoEnabled: !this.data.incognitoEnabled });
	}

	finishOnboarding() {
		this.updateData({ onboardingCompleted: true });
	}

	async setToggleShortcut(toggleShortcut: string) {
		await this.unregisterShortcuts();
		this.updateData({ toggleShortcut });
		await this.registerShortcuts();
	}

	getSearchUrl(query: string) {
		if (appStore.searchMode === SEARCH_MODE.AI) {
			return `https://scira.app/?q=${query}`;
		}

		return match(this.data.defaultSearchEngine)
			.with(
				SEARCH_ENGINE.DUCKDUCKGO,
				() => `https://duckduckgo.com/?q=${query}`,
			)
			.with(
				SEARCH_ENGINE.STARTPAGE,
				() => `https://www.startpage.com/do/search?q=${query}`,
			)
			.with(
				SEARCH_ENGINE.GOOGLE,
				() => `https://www.google.com/search?q=${query}`,
			)
			.exhaustive();
	}

	async setNotesDir(notesDir: string[]) {
		this.updateData({ notesDir });
	}

	async wipeLocalData() {
		await notesStore.clearNotes();
		await commandsStore.clearHistory();
	}
}

export const settingsStore = new SettingsStore({
	schema: SettingsSchema,
	fileName: "settings.json",
	storageKey: "settings",
});
