import type { AppType } from "@getgrinta/api";
import { type UnlistenFn, emit, listen } from "@tauri-apps/api/event";
import { readDir } from "@tauri-apps/plugin-fs";
import { fetch } from "@tauri-apps/plugin-http";
// biome-ignore lint/suspicious/noShadowRestrictedNames: just do it
import AggregateError from "aggregate-error";
import { hc } from "hono/client";
import {
	AppWindowIcon,
	ChevronRightIcon,
	CopyIcon,
	FileIcon,
	FolderIcon,
	GlobeIcon,
	Layers2Icon,
	StickyNoteIcon,
} from "lucide-svelte";
import { match } from "ts-pattern";
import { appStore } from "./store/app.svelte";
import {
	COMMAND_HANDLER,
	type ExecutableCommand,
	APP_MODE,
	THEME,
} from "@getgrinta/core";
import { vaultStore } from "./store/vault.svelte";
import { systemThemeWatcher } from "./system.utils.svelte";
import { env } from "./env";

interface HighlightSegment {
	text: string;
	highlight: boolean;
}

// A helper function to escape RegExp special characters in the search term
function escapeRegExp(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function generateCancellationToken(): string {
	return Math.random().toString(36).substring(2, 12);
}

// The text highlighting function (case insensitive)
export function highlightText(
	text: string,
	search: string,
): HighlightSegment[] {
	// When no search term is provided, return the full text as a single non-highlighted segment
	if (!search) {
		return [{ text, highlight: true }];
	}

	// Create a regular expression with a capturing group for the search term (case insensitive)
	const regex = new RegExp(`(${escapeRegExp(search)})`, "gi");
	// Split the text while preserving the search term in the returned array parts
	const parts = text.split(regex);

	const filteredParts = parts.filter((part) => part !== "");

	// Map each part to an object indicating if it matches the search term (ignoring case)
	return filteredParts.map((part) => ({
		text: part,
		highlight: part.toLowerCase() === search.toLowerCase(),
	}));
}

export async function activateWindow() {
	await appStore.appWindow?.show();
	await appStore.appWindow?.setFocus();
	const queryInput = document.querySelector("#queryInput") as HTMLInputElement;
	return queryInput?.focus();
}

export function getHeaders() {
	return {
		Cookie: vaultStore.data?.authCookie ?? "",
	};
}

export function getApiClient() {
	return hc<AppType>(env.PUBLIC_API_URL, {
		fetch,
		headers: getHeaders(),
	});
}

export function fail(message: string, cause?: Error) {
	const errors = [new Error(message)];
	if (cause) {
		errors.push(cause);
	}
	return new AggregateError(errors);
}

export async function handleContextMenu({
	event,
	name,
}: { event: MouseEvent; name: string }) {
	event.preventDefault();
	event.stopPropagation();
	await emit("hide-context-menu");
	await emit("show-context-menu", {
		x: event.clientX,
		y: event.clientY,
		name,
	});
}

export function clickListener() {
	let unlisten: UnlistenFn;

	async function setup() {
		unlisten = await listen("click", async () => {
			await emit("hide-context-menu");
		});
	}

	setup();

	return () => {
		if (unlisten) unlisten();
	};
}

export function getIcon(command: ExecutableCommand) {
	if (appStore.appMode !== APP_MODE.INITIAL) return ChevronRightIcon;
	return match(command.handler)
		.with(COMMAND_HANDLER.URL, () => GlobeIcon)
		.with(COMMAND_HANDLER.APP, () => AppWindowIcon)
		.with(COMMAND_HANDLER.OPEN_NOTE, () => StickyNoteIcon)
		.with(COMMAND_HANDLER.CREATE_NOTE, () => StickyNoteIcon)
		.with(COMMAND_HANDLER.RUN_SHORTCUT, () => Layers2Icon)
		.with(COMMAND_HANDLER.COPY_TO_CLIPBOARD, () => CopyIcon)
		.with(COMMAND_HANDLER.FS_ITEM, () => {
			if (command.metadata?.contentType === "public.folder") {
				return FolderIcon;
			}
			return FileIcon;
		})
		.otherwise(() => ChevronRightIcon);
}

export type FileEntry = {
	name: string;
	isDirectory: boolean;
	isFile: boolean;
	isSymlink: boolean;
	path: string;
};

export async function findApps(): Promise<FileEntry[]> {
	const apps = (
		await Promise.all([
			findAppsInDirectory("/Applications"),
			findAppsInDirectory("/System/Applications"),
			findAppsInDirectory(
				"/System/Volumes/Preboot/Cryptexes/App/System/Applications",
			),
		])
	).flat();

	return apps;
}

async function findAppsInDirectory(path: string): Promise<FileEntry[]> {
	const entries = await readDir(path);
	const apps: FileEntry[] = [];

	for (const entry of entries) {
		if (entry.isDirectory) {
			if (entry.name.endsWith(".app")) {
				apps.push({
					...entry,
					path: `${path}/${entry.name}`,
				});
			} else {
				// Don't recurse into .app directories
				if (!entry.name.includes(".app/")) {
					try {
						const subApps = await findAppsInDirectory(`${path}/${entry.name}`);
						apps.push(...subApps);
					} catch {
						// Permission errors
					}
				}
			}
		}
	}

	return apps;
}

export class ColorModeValue<T = string> {
	lightModeValue = $state<T>("" as T);
	darkModeValue = $state<T>("" as T);
	value = $derived(
		systemThemeWatcher.theme === THEME.DARK
			? this.darkModeValue
			: this.lightModeValue,
	);

	constructor(lightModeValue: T, darkModeValue: T) {
		this.lightModeValue = lightModeValue;
		this.darkModeValue = darkModeValue;
	}
}
