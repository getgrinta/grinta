import {
	type InvokeArgs,
	type InvokeOptions,
	invoke,
} from "@tauri-apps/api/core";
import { uniq } from "rambda";

export const SUPPORTED_FILE_INDEXING_FILE_EXTENSIONS = [
	// Documents
	"*.txt",
	"*.pdf",
	"*.xls",
	"*.xlsx",
	"*.doc",
	"*.docx",
	"*.ppt",
	"*.pptx",
	"*.zip",
	"*.rar",
	"*.7z",
	"*.md",
	"*.gsheet",
	"*.gdoc",
	"*.gslides",
	"*.drawio",
	"*.odp",
	// Ebooks
	"*.epub",
	"*.mobi",
	"*.djvu",
	// Media
	"*.mp3",
	"*.wav",
	"*.aac",
	"*.ogg",
	"*.flac",
	"*.m4a",
	"*.webm",
	"*.mp4",
	"*.avi",
	"*.mov",
	"*.wmv",
	"*.mkv",
	"*.gif",
	"*.jpg",
	"*.jpeg",
	"*.png",
	"*.webp",
	"*.bmp",
	"*.tiff",
	"*.svg",
	// Config
	"*.json",
	"*.yml",
	"*.yaml",
	"*.toml",
	"*.ini",
] as const;

export type SupportedFileExtension =
	(typeof SUPPORTED_FILE_INDEXING_FILE_EXTENSIONS)[number];

export function setVibrancy(
	materialName: "dark" | "light",
): Promise<SpotlightSearchResult[]> {
	return grintaInvoke("set_vibrancy", { materialName });
}

export type AppInfo = { base64Image: string; localizedName: string };
export type ExtInfo = { base64Image: string; extension: string };

export async function loadAppInfo(
	paths: string[],
): Promise<Record<string, AppInfo>> {
	return grintaInvoke<Record<string, AppInfo>>("load_app_info", {
		resourcesPaths: paths,
	});
}

export async function activateAppByName(name: string): Promise<boolean> {
	return grintaInvoke("activate_application_by_name", { appName: name });
}

export async function getLastFocusedWindowName(): Promise<string> {
	try {
		return await grintaInvoke("get_frontmost_application_name");
	} catch (error) {
		console.error("Failed to get frontmost application name:", error);
		return "";
	}
}

export async function toggleVisibility(): Promise<string> {
	return grintaInvoke("toggle_visibility");
}

export async function searchSpotlightApps(
	query: string,
	additionalExtensions: string[] = [],
	searchOnlyInHome = false,
) {
	return await invoke<SpotlightAppInfo[]>("search_spotlight_apps", {
		query,
		extensions: uniq([
			...SUPPORTED_FILE_INDEXING_FILE_EXTENSIONS,
			...additionalExtensions,
		]),
		searchOnlyInHome: searchOnlyInHome,
	});
}

export async function fetchFavicon(url: string): Promise<string> {
	return await invoke<string>("fetch_favicon", { url });
}

export async function requestAccessToUserFolders(): Promise<
	SpotlightSearchResult[]
> {
	return grintaInvoke<SpotlightSearchResult[]>("search_spotlight_apps", {
		query: "random_request_access_handler",
		extensions: SUPPORTED_FILE_INDEXING_FILE_EXTENSIONS,
		searchOnlyInHome: false,
	});
}

type SpotlightSearchResult = {
	display_name: string;
	path: string;
	content_type: string;
};

type SpotlightAppInfo = {
	display_name: string;
	path: string;
	content_type: string;
};

type GrintaInvokeCommand =
	| "search_spotlight_apps"
	| "set_vibrancy"
	| "load_app_info"
	| "activate_application_by_name"
	| "toggle_visibility"
	| "get_frontmost_application_name"
	| "fetch_favicon"
	| "set_secret"
	| "get_secret"
	| "delete_secret";

function grintaInvoke<T>(
	cmd: GrintaInvokeCommand,
	args?: InvokeArgs,
	options?: InvokeOptions,
): Promise<T> {
	return invoke(cmd, args, options);
}

export async function getMasterKey(): Promise<string> {
	return grintaInvoke("get_secret", {
		serviceName: "grinta",
		accountName: "master-key"
	});
}
