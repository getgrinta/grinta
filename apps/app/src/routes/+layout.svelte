<script lang="ts">
import dayjs from "dayjs";
import LocalizedFormat from "dayjs/plugin/localizedFormat";
import "@fontsource-variable/dm-sans";
import "../app.css";
import { afterNavigate, goto } from "$app/navigation";
import { setVibrancy } from "$lib/grinta-invoke";
import { locale, setupI18n, _ } from "$lib/i18n";
import { appMetadataStore } from "$lib/store/app-metadata.svelte";
import { BAR_MODE, appStore } from "$lib/store/app.svelte";
import { clipboardStore } from "$lib/store/clipboard.svelte";
import { commandsStore } from "$lib/store/commands.svelte";
import { settingsStore } from "$lib/store/settings.svelte";
import { vaultStore } from "$lib/store/vault.svelte";
import { widgetsStore } from "$lib/store/widgets.svelte";
import { systemThemeWatcher } from "$lib/system.utils.svelte";
import { installHotkeys, ColorModeValue } from "$lib/utils.svelte";
import { Menu } from "@tauri-apps/api/menu";
import { TrayIcon } from "@tauri-apps/api/tray";
import { readText } from "@tauri-apps/plugin-clipboard-manager";
import { exit } from "@tauri-apps/plugin-process";
import { open } from "@tauri-apps/plugin-shell";
import { clsx } from "clsx";
import { onMount } from "svelte";
import { toast, Toaster } from "svelte-sonner";
import {
	currentMonitor,
	type PhysicalSize,
	type Monitor,
} from "@tauri-apps/api/window";
import PngIconUrl from "$lib/assets/tray.png?arraybuffer";
    import { watch } from "runed";
const { children } = $props();

dayjs.extend(LocalizedFormat);

let initializing = $state<boolean>(true);
let monitor = $state<Monitor | null>(null);
let lastMonitorScreenSize = $state<PhysicalSize | null>(null);

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

// Sync language with settings
$effect(() => {
	if (settingsStore.data.language) {
		locale.set(settingsStore.data.language);
	}
});

async function initTrayIcon(didFinishOnboarding: boolean) {
	let menuItems = [
		{
			id: "help",
			text: $_("commands.menuItems.help"),
			action() {
				return open("https://getgrinta.com/guides");
			},
		},
		{
			item: "Separator",
		},
		{
			id: "exit",
			text: $_("commands.menuItems.exit"),
			action() {
				return exit();
			},
		},
	];

	if (didFinishOnboarding) {
		menuItems = [
			{
				id: "search",
				text: $_("barMode.initial"),
				action() {
					appStore.appWindow?.show();
					appStore.appWindow?.setFocus();
					return goto("/");
				},
			},
			{
				id: "notes",
				text: $_("barMode.notes"),
				action() {
					appStore.appWindow?.show();
					appStore.appWindow?.setFocus();
					return goto(`/commands/${BAR_MODE.NOTES}`);
				},
			},
			{
				id: "clipboard",
				text: $_("commands.menuItems.clipboardHistory"),
				action() {
					appStore.appWindow?.show();
					appStore.appWindow?.setFocus();
					return goto(`/commands/${BAR_MODE.CLIPBOARD}`);
				},
			},
			{
				item: "Separator",
			},
			{
				id: "settings",
				text: $_("commands.menuItems.settings"),
				action() {
					appStore.appWindow?.show();
					appStore.appWindow?.setFocus();
					return goto("/settings");
				},
			},
			...menuItems,
		];
	}

	console.log(menuItems);

	const TRAY_ID = "grinta";
	const menu = await Menu.new({
		items: menuItems as any,
	});

	TrayIcon.getById(TRAY_ID).then((trayIcon) => {
		if (trayIcon) {
			trayIcon.setMenu(menu);
		} else {
			TrayIcon.new({
				id: TRAY_ID,
				menu,
				icon: PngIconUrl,
				iconAsTemplate: true,
			});
		}
	});
}

async function clipboardSnapshot() {
	try {
		const clipboardText = await readText();

		if (settingsStore.data?.clipboardRecordingEnabled) {
			await clipboardStore.addSnapshot(clipboardText);
		}
	} catch {
		console.log("Unreadable clipboard");
	}
}

function centerWindow() {
	currentMonitor().then((monitor) => {
		if (
			monitor?.size &&
			lastMonitorScreenSize &&
			(monitor.size.width !== lastMonitorScreenSize.width ||
				monitor.size.height !== lastMonitorScreenSize.height)
		) {
			lastMonitorScreenSize = monitor.size;
			appStore.positionWindow();
		}
	});
}

async function openMenu() {
	return goto(`/commands/${BAR_MODE.MENU}`);
}

async function initializeApp() {
	initializing = true;
	await setupI18n();
	await vaultStore.initialize();
	try {
		await appStore.fetchSession();
	} catch (error) {
		console.error(error);
		toast.warning(error.message);
	}
	await commandsStore.initialize();
	await settingsStore.initialize();
	await clipboardStore.initialize();
	await widgetsStore.initialize();
	appMetadataStore.initialize();

	monitor = await currentMonitor();
	lastMonitorScreenSize = monitor?.size ?? null;

	await appStore.positionWindow();
	await appStore.appWindow?.show();

	initializing = false;
}

$effect(() => {
	const _ = settingsStore.data.onboardingCompleted;

	setTimeout(() => {
		initTrayIcon(settingsStore.data.onboardingCompleted);
	}, 1000);
});

const accentLower = $derived(
	settingsStore?.data?.accentColor?.toLowerCase() ?? "mare",
);

const themeName = new ColorModeValue("grinta-light", "grinta-dark");
const bgClass = new ColorModeValue("bg-base-100/60", "bg-base-100/80");
const vibrancyValue = new ColorModeValue<"light" | "dark">("light", "dark");

$effect(() => {
	setVibrancy(vibrancyValue.value);
});

onMount(() => {
	console.info("[Grinta] Layout Mount");
	initializeApp();
	systemThemeWatcher.addEventListner();
	const clipboardIntervalId = setInterval(clipboardSnapshot, 5000);
	const centerWindowIntervalId = setInterval(centerWindow, 1000);

	return () => {
		settingsStore.unregisterShortcuts();
		systemThemeWatcher.removeEventListner();
		clearInterval(clipboardIntervalId);
		clearInterval(centerWindowIntervalId);
	};
});

afterNavigate(({ to }) => {
	installHotkeys();
	if (to?.url?.pathname === "/") return;
});

const toasterTheme = new ColorModeValue<"light" | "dark">("light", "dark");
</script>

<Toaster
	richColors
	position="bottom-center"
	theme={toasterTheme.value}
/>

<main
	id="mainLayout"
	class={clsx(
		"flex-1 flex flex-col accent-mare",
		bgClass.value,
		widgetsStore.showWidgets && "widgets-visible",
	)}
	data-theme={themeName.value}
	data-accent={accentLower}
>
	<button type="button" class="hidden" onclick={openMenu} data-hotkey="Mod+k"
		>Open Settings</button
	>
	{#if initializing}
		<div class="skeleton w-full h-10 rounded-none"></div>
	{:else}
		{@render children?.()}
	{/if}
</main>
