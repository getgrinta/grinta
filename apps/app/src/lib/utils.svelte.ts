import { env } from "$env/dynamic/public";
import type { AppType } from "@getgrinta/api";
import { install } from "@github/hotkey";
import { fetch } from "@tauri-apps/plugin-http";
import { Position, moveWindow } from "@tauri-apps/plugin-positioner";
// biome-ignore lint/suspicious/noShadowRestrictedNames: nah
import AggregateError from "aggregate-error";
import { hc } from "hono/client";
import { useEventListener } from "runed";
import { appStore } from "./store/app.svelte";
import { settingsStore } from "./store/settings.svelte";
import { vaultStore } from "./store/vault.svelte";

const THEME_QUERY = "(prefers-color-scheme: dark)";

const THEME = {
	DARK: "DARK",
	LIGHT: "LIGHT",
} as const;

type Theme = keyof typeof THEME;

export class SystemThemeWatcher {
	systemTheme = $state<Theme>();
	theme = $derived(
		settingsStore.data.theme === "SYSTEM"
			? (this.systemTheme ?? "DARK")
			: settingsStore.data.theme,
	);

	constructor() {
		this.setInitialSystemTheme();
		useEventListener(
			() => window.matchMedia(THEME_QUERY),
			"change",
			this.handleSystemThemeChange,
		);
	}

	setInitialSystemTheme() {
		this.systemTheme = window?.matchMedia?.(THEME_QUERY)?.matches
			? THEME.DARK
			: THEME.LIGHT;
	}

	handleSystemThemeChange(event: MediaQueryListEvent) {
		this.systemTheme = event.matches ? THEME.DARK : THEME.LIGHT;
	}
}

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
