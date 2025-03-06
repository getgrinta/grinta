import { browser } from "$app/environment";
import { activateWindow } from "$lib/utils.svelte";
import {
	type ShortcutEvent,
	register,
	unregisterAll,
} from "@tauri-apps/plugin-global-shortcut";
import { match } from "ts-pattern";
import { z } from "zod";
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

// Get browser language or default to English
const getBrowserLanguage = (): Language => {
	if (!browser) return LANGUAGE.EN;

	const browserLang = window.navigator.language.split("-")[0];

	const enumKey = LANGUAGE_CODE_TO_ENUM[browserLang];
	return enumKey ? LANGUAGE[enumKey] : LANGUAGE.EN;
};

export const SettingsSchema = z.object({
	toggleShortcut: z.string().default("CommandOrControl+Space"),
	theme: z.nativeEnum(THEME).default(THEME.SYSTEM),
	accentColor: z.nativeEnum(ACCENT_COLOR).default(ACCENT_COLOR.MARE),
	language: z.nativeEnum(LANGUAGE).default(getBrowserLanguage()),
	aiModelName: z.string().default("ministral-small-latest"),
	defaultSearchEngine: z
		.nativeEnum(SEARCH_ENGINE)
		.default(SEARCH_ENGINE.STARTPAGE),
	aiEndpointUrl: z.string().default("https://api.mistral.ai/v1"),
	aiSecretKey: z.string().default(""),
	aiAdditionalContext: z.string().default(""),
	notesDir: z.array(z.string()).default(["Grinta", "notes"]),
	notesAiEnabled: z.boolean().default(true),
	incognitoEnabled: z.boolean().default(false),
});

export type Settings = z.infer<typeof SettingsSchema>;

async function toggleShortcutHandler(event: ShortcutEvent) {
	if (!appStore.appWindow) return;
	if (event.state !== "Pressed") return;
	const visible = await appStore.appWindow.isVisible();
	if (!visible) {
		return activateWindow();
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
