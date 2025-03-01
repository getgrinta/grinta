import type { Window } from "@tauri-apps/api/window";
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

	switchMode(mode: string) {
		const barMode = barModeEnum.parse(mode);
		this.barMode = barMode;
	}

	toggleSearchMode() {
		const searchMode =
			this.searchMode === SEARCH_MODE.WEB ? SEARCH_MODE.AI : SEARCH_MODE.WEB;
		this.searchMode = searchMode;
	}

	getSearchUrl(query: string) {
		if (this.searchMode === SEARCH_MODE.AI) {
			return `https://scira.app/?q=${query}`;
		}
		return `https://www.startpage.com/do/search?q=${query}`;
	}

	setQuery(query: string) {
		this.query = query;
	}

	clearQuery() {
		return this.setQuery("");
	}
}

export const appStore = new AppStore();
