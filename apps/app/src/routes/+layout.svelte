<script lang="ts">
import dayjs from "dayjs";
import LocalizedFormat from "dayjs/plugin/localizedFormat";
import "@fontsource-variable/dm-sans";
import "../app.css";
import { afterNavigate, goto } from "$app/navigation";
import { BAR_MODE, appStore } from "$lib/store/app.svelte";
import { clipboardStore } from "$lib/store/clipboard.svelte";
import { commandsStore } from "$lib/store/commands.svelte";
import { THEME, settingsStore } from "$lib/store/settings.svelte";
import { installHotkeys } from "$lib/utils.svelte";
import { systemThemeWatcher } from "$lib/utils.svelte";
import { defaultWindowIcon } from "@tauri-apps/api/app";
import { Menu } from "@tauri-apps/api/menu";
import { TrayIcon } from "@tauri-apps/api/tray";
import { getCurrentWindow } from "@tauri-apps/api/window";
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

let trap = $state();

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

function initializeApp() {
	if (appStore.appWindow) return;
	systemThemeWatcher.initialize();
	commandsStore.initialize();
	settingsStore.initialize();
	clipboardStore.initialize();
	appStore.appWindow = getCurrentWindow();
	initTrayIcon();
	moveWindow(Position.TopCenter);
}

const accentColorClass = $derived(
	`accent-${settingsStore.settings.accentColor.toLowerCase()}-${systemThemeWatcher.theme.toLowerCase()}`,
);

const themeName = $derived(
	systemThemeWatcher.theme === THEME.DARK ? "grinta-dark" : "grinta-light",
);

const bgClass = $derived(
	systemThemeWatcher.theme === THEME.DARK ? "bg-base-200/40" : "bg-white/90",
);

onMount(() => {
	console.info("[Grinta] Layout Mount");
	initializeApp();
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

afterNavigate(({ from, to }) => {
	installHotkeys();
	if (to?.url?.pathname === "/") return;
	trap = focusTrap.createFocusTrap("#mainLayout");
	trap?.activate();
});
</script>

<Toaster theme="dark" position="bottom-center" richColors />

<main id="mainLayout" class={clsx("flex-1 flex flex-col p-4", accentColorClass, bgClass)} data-theme={themeName}>
	<button type="button" class="hidden" onclick={openMenu} data-hotkey="Mod+k">Open Settings</button>
  {@render children?.()}
</main>
