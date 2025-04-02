import type { SanitizedSubscription } from "@getgrinta/api";
import { until } from "@open-draft/until";
import {
	LogicalPosition,
	type Window,
	getCurrentWindow,
	currentMonitor,
	PhysicalSize,
} from "@tauri-apps/api/window";
import type { Session, User } from "better-auth";
import { z } from "zod";
import { getAuthClient } from "../auth";
import { fail, getApiClient } from "../utils.svelte";
import { check as checkUpdate } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { toast } from "svelte-sonner";
import { _ } from "svelte-i18n";

export const BAR_MODE = {
	INITIAL: "INITIAL",
	MENU: "MENU",
	NOTES: "NOTES",
	CLIPBOARD: "CLIPBOARD",
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
	lastFocusedWindowName = $state<string>();
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

	clearSessionData() {
		this.session = undefined;
		this.user = undefined;
	}

	async fetchSession() {
		const apiClient = getApiClient();
		const authClient = getAuthClient();
		const { data: sessionData, error: sessionError } =
			await authClient.getSession();
		if (sessionError) {
			throw fail("Session error", new Error(sessionError.message));
		}
		if (!sessionData) {
			return;
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

	setLastFocusedWindowName(name: string) {
		this.lastFocusedWindowName = name;
	}

	async positionWindow() {
		const monitor = await currentMonitor();
		if (!monitor) return;

		const size = monitor.size.toLogical(monitor.scaleFactor);
		let physicalSize = new PhysicalSize(0, 88);
		return this.appWindow?.setPosition(
			new LogicalPosition(
				size.width / 2 - 400,
				physicalSize.toLogical(monitor.scaleFactor).height,
			),
		);
	}

	async updateApp() {
		await this.appWindow?.show();
		try {
			const update = await checkUpdate();
			if (!update) return toast.info("No update available.");
			await update.downloadAndInstall();
			return relaunch();
		} catch (error) {
			console.error(error);
			toast.error("Failed to update app.");
		}
	}
}

export const appStore = new AppStore();
