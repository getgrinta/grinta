import {
	type InvokeArgs,
	type InvokeOptions,
	invoke,
} from "@tauri-apps/api/core";

export function setVibrancy(
	materialName: "dark" | "light",
): Promise<SpotlightSearchResult[]> {
	return grintaInvoke("set_vibrancy", { materialName: materialName });
}

export type AppInfo = { base64Image: string; localizedName: string };

export function loadAppInfo(paths: string[]): Promise<Record<string, AppInfo>> {
	return grintaInvoke<Record<string, AppInfo>>("load_app_info", {
		resourcesPaths: paths,
	});
}

export function searchSpotlightApps(
	query: string,
): Promise<SpotlightSearchResult[]> {
	return grintaInvoke<SpotlightSearchResult[]>("search_spotlight_apps", {
		query,
	});
}

export function requestAccessToUserFolders(): Promise<SpotlightSearchResult[]> {
	return grintaInvoke<SpotlightSearchResult[]>("search_spotlight_apps", {
		query: "random_request_access_handler",
	});
}

type SpotlightSearchResult = {
	display_name: string;
	path: string;
	content_type: string;
};

type GrintaInvokeCommand =
	| "search_spotlight_apps"
	| "set_vibrancy"
	| "load_app_info";

function grintaInvoke<T>(
	cmd: GrintaInvokeCommand,
	args?: InvokeArgs,
	options?: InvokeOptions,
): Promise<T> {
	return invoke(cmd, args, options);
}
