<script lang="ts">
import dayjs from "dayjs";
import LocalizedFormat from "dayjs/plugin/localizedFormat";
import "@fontsource-variable/dm-sans";
import "../app.css";
import { afterNavigate, goto } from "$app/navigation";
import { locale, setupI18n } from "$lib/i18n";
import { appMetadataStore } from "$lib/store/app-metadata.svelte";
import { BAR_MODE, appStore } from "$lib/store/app.svelte";
import { clipboardStore } from "$lib/store/clipboard.svelte";
import { commandsStore } from "$lib/store/commands.svelte";
import { THEME, settingsStore } from "$lib/store/settings.svelte";
import { vaultStore } from "$lib/store/vault.svelte";
import { installHotkeys } from "$lib/utils.svelte";
import { SystemThemeWatcher } from "$lib/utils.svelte";
import { defaultWindowIcon } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";
import { Menu } from "@tauri-apps/api/menu";
import { TrayIcon } from "@tauri-apps/api/tray";
import { readText } from "@tauri-apps/plugin-clipboard-manager";
import { Position, moveWindow } from "@tauri-apps/plugin-positioner";
import { exit } from "@tauri-apps/plugin-process";
import { open } from "@tauri-apps/plugin-shell";
import { clsx } from "clsx";
import * as focusTrap from "focus-trap";
import { onMount } from "svelte";
import { Toaster } from "svelte-sonner";
const { children } = $props();

dayjs.extend(LocalizedFormat);

let initializing = $state<boolean>(true);

if (process.env.NODE_ENV === "development") {
	window.onerror = (_event, _source, _lineno, _colno, err) => {
		const ErrorOverlay = customElements.get("vite-error-overlay");
		if (!ErrorOverlay) {
			return;
		}
		const overlay = new ErrorOverlay(err);
		document.body.appendChild(overlay);
	};
}

const systemThemeWatcher = new SystemThemeWatcher();

// Sync language with settings
$effect(() => {
	if (settingsStore.data.language) {
		locale.set(settingsStore.data.language);
	}
});

let trap = $state<focusTrap.FocusTrap>();

async function initTrayIcon() {
	const menu = await Menu.new({
		items: [
			{
				id: "search",
				text: "Search",
				action() {
					appStore.appWindow?.show();
					appStore.appWindow?.setFocus();
					return goto("/");
				},
			},
			{
				id: "notes",
				text: "Notes",
				action() {
					appStore.appWindow?.show();
					appStore.appWindow?.setFocus();
					return goto(`/commands/${BAR_MODE.NOTES}`);
				},
			},
			{
				item: "Separator",
			},
			{
				id: "settings",
				text: "Settings",
				action() {
					appStore.appWindow?.show();
					appStore.appWindow?.setFocus();
					return goto("/settings");
				},
			},
			{
				id: "help",
				text: "Help",
				action() {
					return open("https://getgrinta.com/docs");
				},
			},
			{
				item: "Separator",
			},
			{
				id: "exit",
				text: "Exit Grinta",
				action() {
					return exit();
				},
			},
		],
	});
	const options = {
		menu,
		icon: (await defaultWindowIcon()) ?? undefined,
	};
	await TrayIcon.new(options);
}

async function clipboardSnapshot() {
	try {
		const clipboardText = await readText();
		await clipboardStore.addSnapshot(clipboardText);
	} catch {
		console.log("Unreadable clipboard");
	}
}

function activateFocusTrap() {
	return trap?.activate();
}

async function hideWindow() {
	if (appStore.barMode === BAR_MODE.NOTES) {
		appStore.switchMode(BAR_MODE.INITIAL);
	}
	return appStore.appWindow?.hide();
}

async function openMenu() {
	return goto(`/commands/${BAR_MODE.MENU}`);
}

async function initializeApp() {
	initializing = true;
	await setupI18n();
	await vaultStore.initialize();
	await appStore.fetchSession();
	await commandsStore.initialize();
	await settingsStore.initialize();
	await clipboardStore.initialize();
	appMetadataStore.initializeIcons();
	initTrayIcon();

	moveWindow(Position.TopCenter).then(() => {
		appStore.appWindow?.show();
	});

	initializing = false;
}

const accentLower = $derived(
	settingsStore?.data?.accentColor?.toLowerCase() ?? "mare",
);
const themeLower = $derived(
	systemThemeWatcher?.theme?.toLowerCase() ?? "light",
);

const accentColorClass = $derived(`accent-${accentLower}-${themeLower}`);

const themeName = $derived(
	systemThemeWatcher.theme === THEME.DARK ? "grinta-dark" : "grinta-light",
);

const bgClass = $derived(
	systemThemeWatcher.theme === THEME.DARK ? "bg-base-200/20" : "bg-white/20",
);

$effect(() => {
	const isDarkTheme = systemThemeWatcher.theme === "DARK";
	invoke("set_vibrancy", {
		materialName: isDarkTheme ? "dark" : "light",
	});
});

onMount(() => {
	console.info("[Grinta] Layout Mount");
	initializeApp();
	// Initialize i18n
	window.addEventListener("blur", hideWindow);
	window.addEventListener("focus", activateFocusTrap);
	const intervalId = setInterval(clipboardSnapshot, 5000);
	return () => {
		settingsStore.unregisterShortcuts();
		window.removeEventListener("blur", hideWindow);
		window.removeEventListener("focus", activateFocusTrap);
		clearInterval(intervalId);
	};
});

afterNavigate(({ to }) => {
	installHotkeys();
	if (to?.url?.pathname === "/") return;
	trap = focusTrap.createFocusTrap("body");
	trap?.activate();
});
</script>

<Toaster theme="dark" position="bottom-center" richColors />

<main id="mainLayout" class={clsx("flex-1 flex flex-col", accentColorClass, bgClass)} data-theme={themeName}>
	<button type="button" class="hidden" onclick={openMenu} data-hotkey="Mod+k">Open Settings</button>
	{#if initializing}
		<div class="skeleton w-full h-10"></div>
	{:else}
		{@render children?.()}
	{/if}
</main>
