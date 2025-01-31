<script lang="ts">
import dayjs from "dayjs";
import LocalizedFormat from "dayjs/plugin/localizedFormat";
import "@fontsource-variable/dm-sans";
import "../app.css";
import { afterNavigate, goto } from "$app/navigation";
import { page } from "$app/stores";
import { BAR_MODE, appStore } from "$lib/store/app.svelte";
import { clipboardStore } from "$lib/store/clipboard.svelte";
import { commandsStore } from "$lib/store/commands.svelte";
import { THEME, settingsStore } from "$lib/store/settings.svelte";
import { systemThemeWatcher } from "$lib/utils.svelte";
import { install } from "@github/hotkey";
import { defaultWindowIcon } from "@tauri-apps/api/app";
import { Menu } from "@tauri-apps/api/menu";
import { TrayIcon } from "@tauri-apps/api/tray";
import { type Window, getCurrentWindow } from "@tauri-apps/api/window";
import { readText } from "@tauri-apps/plugin-clipboard-manager";
import { Position, moveWindow } from "@tauri-apps/plugin-positioner";
import { clsx } from "clsx";
import * as focusTrap from "focus-trap";
import { onMount } from "svelte";
const { children } = $props();

dayjs.extend(LocalizedFormat);

let trap = $state();

async function initTrayIcon() {
	const menu = await Menu.new({
		items: [
			{
				id: "quit",
				text: "Quit",
			},
		],
	});
	const options = {
		menu,
		icon: await defaultWindowIcon(),
	};
	const tray = await TrayIcon.new(options);
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

async function installHotkeys() {
	for (const el of document.querySelectorAll("[data-hotkey]")) {
		install(el as HTMLElement);
	}
}

async function hideWindow() {
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
	appStore.previousPathname = from?.url?.pathname ?? "/";
	if (to?.url?.pathname === "/") return;
	trap = focusTrap.createFocusTrap("#mainLayout");
	trap?.activate();
});
</script>

<main id="mainLayout" class={clsx("flex-1 flex flex-col p-4", accentColorClass, bgClass)} data-theme={themeName}>
	<button type="button" class="hidden" onclick={openMenu} data-hotkey="Mod+k">Open Settings</button>
  {@render children?.()}
</main>
