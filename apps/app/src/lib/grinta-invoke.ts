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

export function searchSpotlightApps(
	query: string,
): Promise<SpotlightSearchResult[]> {
	return grintaInvoke<SpotlightSearchResult[]>("search_spotlight_apps", {
		query,
	});
}

type SpotlightSearchResult = {
	display_name: string;
	path: string;
	content_type: string;
};

type GrintaInvokeCommand = "search_spotlight_apps" | "set_vibrancy";

function grintaInvoke<T>(
	cmd: GrintaInvokeCommand,
	args?: InvokeArgs,
	options?: InvokeOptions,
): Promise<T> {
	return invoke(cmd, args, options);
}
