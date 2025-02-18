import type { Window } from "@tauri-apps/api/window";
import { z } from "zod";

export const BAR_MODE = {
	INITIAL: "INITIAL",
	MENU: "MENU",
	NOTES: "NOTES",
} as const;

export type BarMode = keyof typeof BAR_MODE;

export const barModeEnum = z.nativeEnum(BAR_MODE);

export class AppStore {
	query = $state("");
	barMode = $state<BarMode>(BAR_MODE.INITIAL);
	appWindow = $state<Window>();

	switchMode(mode: string) {
		const barMode = barModeEnum.parse(mode);
		this.barMode = barMode;
	}

	setQuery(query: string) {
		this.query = query;
	}

	clearQuery() {
		return this.setQuery("");
	}
}

export const appStore = new AppStore();
