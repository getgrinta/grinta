import { activateWindow } from "$lib/utils.svelte";
import {
	type ShortcutEvent,
	register,
	unregisterAll,
} from "@tauri-apps/plugin-global-shortcut";
import { load } from "@tauri-apps/plugin-store";
import superjson from "superjson";
import { match } from "ts-pattern";
import { z } from "zod";
import { SEARCH_MODE, appStore } from "./app.svelte";
import { commandsStore } from "./commands.svelte";
import { notesStore } from "./notes.svelte";

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

export type Language = (typeof LANGUAGE)[keyof typeof LANGUAGE];

export const SettingsSchema = z.object({
	toggleShortcut: z.string().default("CommandOrControl+Space"),
	theme: z.nativeEnum(THEME).default(THEME.SYSTEM),
	accentColor: z.nativeEnum(ACCENT_COLOR).default(ACCENT_COLOR.MARE),
	language: z
		.enum([LANGUAGE.EN, LANGUAGE.PL, LANGUAGE.DE])
		.default(LANGUAGE.EN),
	aiModelName: z.string().default("ministral-3b-latest"),
	defaultSearchEngine: z
		.nativeEnum(SEARCH_ENGINE)
		.default(SEARCH_ENGINE.STARTPAGE),
	aiEndpointUrl: z.string().default("https://api.mistral.ai/v1"),
	aiSecretKey: z.string().default(""),
	aiAdditionalContext: z.string().default(""),
	notesDir: z.array(z.string()).default(["Grinta", "notes"]),
	notesAiEnabled: z.boolean().default(true),
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

export class SettingsStore {
	settings = $state<Settings>(SettingsSchema.parse({}));

	async initialize() {
		const store = await load("settings.json");
		const settings = await store.get<string>("settings");
		if (!settings) return;
		const settingsParsed = SettingsSchema.parse(superjson.parse(settings));
		this.settings = settingsParsed;
		await this.registerShortcuts();
	}

	async registerShortcuts() {
		await register(this.settings.toggleShortcut, toggleShortcutHandler);
	}

	async unregisterShortcuts() {
		await unregisterAll();
	}

	async setToggleShortcut(toggleShortcut: string) {
		await this.unregisterShortcuts();
		this.settings.toggleShortcut = toggleShortcut;
		await this.registerShortcuts();
	}

	getSearchUrl(query: string) {
		if (appStore.searchMode === SEARCH_MODE.AI) {
			return `https://scira.app/?q=${query}`;
		}

		return match(this.settings.defaultSearchEngine)
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
		this.settings.notesDir = notesDir;
		await this.persist();
	}

	async wipeLocalData() {
		await notesStore.clearNotes();
		await commandsStore.clearHistory();
	}

	async persist() {
		const store = await load("settings.json");
		const settingsParsed = SettingsSchema.parse(this.settings);
		const settingsString = superjson.stringify(settingsParsed);
		await store.set("settings", settingsString);
		await store.save();
	}
}

export const settingsStore = new SettingsStore();
