import { getAuthClient } from "$lib/auth";
import { until } from "@open-draft/until";
import { type Window, getCurrentWindow } from "@tauri-apps/api/window";
import type { Session, User } from "better-auth";
import { z } from "zod";

export const BAR_MODE = {
	INITIAL: "INITIAL",
	MENU: "MENU",
	NOTES: "NOTES",
} as const;

export type BarMode = keyof typeof BAR_MODE;

export const barModeEnum = z.nativeEnum(BAR_MODE);

export const SEARCH_MODE = {
	WEB: "WEB",
	AI: "AI",
} as const;

export type SearchMode = keyof typeof SEARCH_MODE;

export class AppStore {
	query = $state("");
	barMode = $state<BarMode>(BAR_MODE.INITIAL);
	searchMode = $state<SearchMode>(SEARCH_MODE.WEB);
	appWindow = $state<Window>();
	session = $state<Session>();
	user = $state<User>();

	constructor() {
		this.appWindow = getCurrentWindow();
	}

	async setSession() {
		const authClient = getAuthClient();
		const { data, error } = await until(authClient.getSession);
		if (error) {
			console.log("No session found");
		}
		this.session = data?.data?.session;
		this.user = data?.data?.user;
	}

	async switchMode(mode: string) {
		const barMode = barModeEnum.parse(mode);
		this.barMode = barMode;
	}

	toggleSearchMode() {
		const searchMode =
			this.searchMode === SEARCH_MODE.WEB ? SEARCH_MODE.AI : SEARCH_MODE.WEB;
		this.searchMode = searchMode;
	}

	setQuery(query: string) {
		this.query = query;
	}

	clearQuery() {
		return this.setQuery("");
	}
}

export const appStore = new AppStore();
