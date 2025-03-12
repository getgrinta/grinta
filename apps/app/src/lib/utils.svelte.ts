import { env } from "$env/dynamic/public";
import type { AppType } from "@getgrinta/api";
import { install } from "@github/hotkey";
import { type UnlistenFn, emit, listen } from "@tauri-apps/api/event";
import { fetch } from "@tauri-apps/plugin-http";
import { Position, moveWindow } from "@tauri-apps/plugin-positioner";
// biome-ignore lint/suspicious/noShadowRestrictedNames: nah
import AggregateError from "aggregate-error";
import { hc } from "hono/client";
import {
	AppWindowIcon,
	ChevronRightIcon,
	CopyIcon,
	EqualIcon,
	GlobeIcon,
	Layers2Icon,
	StickyNoteIcon,
} from "lucide-svelte";
import { match } from "ts-pattern";
import { BAR_MODE, appStore } from "./store/app.svelte";
import { COMMAND_HANDLER, type CommandHandler } from "./store/commands.svelte";
import { vaultStore } from "./store/vault.svelte";

export async function installHotkeys() {
	for (const el of document.querySelectorAll("[data-hotkey]")) {
		install(el as HTMLElement);
	}
}

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
		return [{ text, highlight: false }];
	}

	// Create a regular expression with a capturing group for the search term (case insensitive)
	const regex = new RegExp(`(${escapeRegExp(search)})`, "gi");
	// Split the text while preserving the search term in the returned array parts
	const parts = text.split(regex);

	// Map each part to an object indicating if it matches the search term (ignoring case)
	return parts
		.filter((part) => part !== "") // Remove empty strings if any
		.map((part) => ({
			text: part,
			highlight: part.toLowerCase() === search.toLowerCase(),
		}));
}

export async function activateWindow() {
	await appStore.appWindow?.show();
	await appStore.appWindow?.setFocus();
	moveWindow(Position.TopCenter);
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
	context,
}: { event: MouseEvent; name: string; context: unknown }) {
	event.preventDefault();
	event.stopPropagation();
	await emit("show-context-menu", {
		x: event.clientX,
		y: event.clientY,
		name,
		context,
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

export function getIcon(handler: CommandHandler) {
	if (appStore.barMode !== BAR_MODE.INITIAL) return ChevronRightIcon;
	return match(handler)
		.with(COMMAND_HANDLER.URL, () => GlobeIcon)
		.with(COMMAND_HANDLER.APP, () => AppWindowIcon)
		.with(COMMAND_HANDLER.OPEN_NOTE, () => StickyNoteIcon)
		.with(COMMAND_HANDLER.CREATE_NOTE, () => StickyNoteIcon)
		.with(COMMAND_HANDLER.FORMULA_RESULT, () => EqualIcon)
		.with(COMMAND_HANDLER.RUN_SHORTCUT, () => Layers2Icon)
		.with(COMMAND_HANDLER.COPY_TO_CLIPBOARD, () => CopyIcon)
		.otherwise(() => ChevronRightIcon);
}
