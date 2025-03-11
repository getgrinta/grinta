import { getAuthClient } from "$lib/auth";
import { fail, getApiClient } from "$lib/utils.svelte";
import type { SanitizedSubscription } from "@getgrinta/api";
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
	subscriptions = $state<SanitizedSubscription[]>([]);

	constructor() {
		this.appWindow = getCurrentWindow();
	}

	setSessionData({ session, user }: { session: Session; user: User }) {
		this.session = session;
		this.user = user;
	}

	async fetchSession() {
		const apiClient = getApiClient();
		const authClient = getAuthClient();
		const { data: sessionData, error: sessionError } =
			await authClient.getSession();
		if (sessionError) {
			throw fail("Session error", new Error(sessionError.message));
		}
		this.setSessionData(sessionData);
		const { data: profileRequest, error: profileRequestError } = await until(
			() => apiClient.api.users.me.$get(),
		);
		if (profileRequestError) {
			throw fail("Profile request error", profileRequestError);
		}
		if (!profileRequest) {
			throw fail("Profile request error");
		}
		const { data: profile, error: profileError } = await until(() =>
			profileRequest.json(),
		);
		if (profileError) {
			throw fail("Profile error", profileError);
		}
		this.subscriptions = profile?.subscriptions ?? [];
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
