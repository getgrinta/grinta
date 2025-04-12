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
import { getAuthClient } from "../auth";
import { fail, getApiClient } from "../utils.svelte";
import { check as checkUpdate } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { toast } from "svelte-sonner";
import { APP_MODE, appModeEnum, type AppMode } from "@getgrinta/core";
import { toggleVisibility } from "../grinta-invoke";
import { page } from "$app/state";
import { goto } from "$app/navigation";

export class AppStore {
	query = $state("");
	appMode = $state<AppMode>(APP_MODE.INITIAL);
	appWindow = $state<Window>();
	lastFocusedWindowName = $state<string>();
	menuOpen = $state<boolean>(false);
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

	switchMode(mode: string) {
		const appMode = appModeEnum.parse(mode);
		this.appMode = appMode;
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

	setMenuOpen(open: boolean) {
		this.menuOpen = open;
	}

	handleEscape() {
		if (this.menuOpen) return this.setMenuOpen(false);
		if (this.appMode !== APP_MODE.INITIAL) {
			return this.switchMode(APP_MODE.INITIAL);
		}
		if (!page.url.pathname.includes('/commands')) {
			return goto('/commands/INITIAL')
		}
		return toggleVisibility()
	}

	async positionWindow() {
		const monitor = await currentMonitor();
		if (!monitor) return;

		const size = monitor.size.toLogical(monitor.scaleFactor);
		const physicalSize = new PhysicalSize(0, 88);
		return this.appWindow?.setPosition(
			new LogicalPosition(
				size.width / 2 - 400,
				physicalSize.toLogical(monitor.scaleFactor).height,
			),
		);
	}

	async updateApp() {
		let finished = false;
		await this.appWindow?.show();
		const updateCheckPromise = checkUpdate();
		toast.promise(updateCheckPromise, {
			loading: "Checking for updates...",
			error: "Failed to check for updates.",
		});
		const update = await updateCheckPromise;
		if (!update) return toast.info("No update available.");
		const installPromise = update.downloadAndInstall(({ event }) => {
			if (event === "Finished") {
				finished = true;
			}
		});
		toast.promise(installPromise, {
			loading: "Installing update...",
			error: "Failed to install update.",
		});
		await installPromise;
		if (!finished) return;
		return relaunch();
	}
}

export const appStore = new AppStore();
