<script lang="ts">
import { goto } from "$app/navigation";
import SegmentedControl from "$lib/components/segmented-control.svelte";
import TopBar from "$lib/components/top-bar.svelte";
import { appStore } from "$lib/store/app.svelte";
import {
	ACCENT_COLOR,
	LANGUAGE_NATIVE_NAME,
	SEARCH_ENGINE,
	SEARCH_ENGINE_STYLED,
	THEME,
	baseCurrencies,
	settingsStore,
} from "$lib/store/settings.svelte";
import humanizeString from "humanize-string";
import { PressedKeys, watch } from "runed";
import { _ } from "svelte-i18n";
import packageJson from "../../../package.json" with { type: "json" };
import { SUPPORTED_FILE_INDEXING_FILE_EXTENSIONS } from "$lib/grinta-invoke";
import { toast } from "svelte-sonner";
import { clipboardStore } from "$lib/store/clipboard.svelte";
import {
	requestAccessibilityPermission,
	requestFullDiskAccessPermission,
} from "tauri-plugin-macos-permissions-api";
import {
	isEnabled as getIsAutostartEnabled,
	enable as enableAutostart,
} from "@tauri-apps/plugin-autostart";
import { onMount } from "svelte";

const pressedKeys = new PressedKeys();

const baseTabs = [
	{ label: $_("settings.tabs.general"), value: "general", hotkey: "⌘1" },
	{ label: $_("settings.tabs.search"), value: "search", hotkey: "⌘2" },
	{
		label: $_("settings.tabs.permissions"),
		value: "permissions",
		hotkey: "⌘3",
	},
];

const proTabs = [
	...baseTabs,
	{ label: $_("settings.tabs.pro"), value: "pro", hotkey: "⌘4" },
];

const tabs = $derived(appStore.subscriptions.length > 0 ? proTabs : baseTabs);

let newToggleShortcut = $state<string[]>([]);
let recordingShortcut = $state(false);
let currentTab = $state("general");
let extensionValue = $state("");
let isAutostartEnabled = $state(false);
const themes = Object.keys(THEME);
const accentColors = Object.keys(ACCENT_COLOR);

function changeTab(tab: string) {
	currentTab = tab;
}

function toggleShortcutRecording() {
	newToggleShortcut = [];
	recordingShortcut = !recordingShortcut;
}

const toggleShortcut = $derived(
	newToggleShortcut.length > 1
		? newToggleShortcut.join("+")
		: settingsStore.data.toggleShortcut,
);

const recordShortcutLabel = $derived(
	recordingShortcut
		? $_("settings.fields.recordShortcut")
		: $_("settings.fields.changeShortcut"),
);

function processShortcut(keys: string[]) {
	return keys
		.map((key) => {
			if (key === "meta") return "CommandOrControl";
			if (key === "space") return "Space";
			if (key === " ") return "Space";
			if (key === "alt") return "Alt";
			if (key === "shift") return "Shift";
			return key;
		})
		.join("+");
}

function updateNotesDir(event: Event) {
	const notesDirSplit = (event.target as HTMLInputElement).value.split("/");
	return settingsStore.setNotesDir(notesDirSplit);
}

const notesDirString = $derived(settingsStore.data.notesDir.join("/"));

async function wipeLocalData() {
	await settingsStore.wipeLocalData();
	return goto("/");
}

async function requestAccessibilityPermissions() {
	await requestAccessibilityPermission();
	await settingsStore.syncPermissions();
}

async function requestFsPermissions() {
	await requestFullDiskAccessPermission();
	await settingsStore.syncPermissions();
}

async function initialize() {
	isAutostartEnabled = await getIsAutostartEnabled();
}

async function requestAutostartPermission() {
	await enableAutostart();
	isAutostartEnabled = await getIsAutostartEnabled();
}

$effect(() => {
	if (!recordingShortcut) return;
	const newShortcut = pressedKeys.all;
	if (newShortcut.length <= newToggleShortcut.length) return;
	newToggleShortcut = newShortcut;
});

$effect(() => {
	settingsStore.syncPermissions();
});

$effect(() => {
	// Save new shortcut when theres a new toggle combo and user lifted up all keys
	if (!recordingShortcut) return;
	if (newToggleShortcut.length < 1) return;
	if (pressedKeys.all.length !== 0) return;
	const processedShortcut = processShortcut(newToggleShortcut);
	settingsStore.setToggleShortcut(processedShortcut);
	settingsStore.persist();
	toggleShortcutRecording();
});

watch(
	() => $state.snapshot(settingsStore.data),
	(before, after) => {
		settingsStore.persist();

		// Clear clipboard history when clipboard recording is disabled
		if (
			before?.clipboardRecordingEnabled &&
			!after?.clipboardRecordingEnabled
		) {
			clipboardStore.clearClipboardHistory();
		}
	},
);

onMount(initialize);

const isCmdPressed = $derived(pressedKeys.has("Meta"));

const controls = $derived(
	tabs.map((tab, i) => ({
		text: $_(tab.label),
		onClick: () => changeTab(tab.value),
		active: currentTab === tab.value,
		shortcut: isCmdPressed ? tab.hotkey : undefined,
		hotkey: `Mod+${i + 1}`,
	})),
);

function addExtension(e?: Event) {
	e?.preventDefault();

	let extension = extensionValue.trim();
	if (!extension) return;
	if (!extension.startsWith(".")) {
		extension = `.${extension}`;
	}

	const extensionRegex = /^\.[a-zA-Z0-9]+$/;

	if (!extensionRegex.test(extension)) {
		toast.error($_("settings.extension_invalid_format"));
		return;
	}

	if (settingsStore.data.fsSearchAdditionalExtensions.includes(extension)) {
		toast.error($_("settings.extension_already_added"));
		return;
	}

	if (
		SUPPORTED_FILE_INDEXING_FILE_EXTENSIONS.includes(`*${extension}` as any)
	) {
		toast.error($_("settings.extension_supported_by_default"));
		return;
	}

	settingsStore.setFsSearchAdditionalExtensions([
		...settingsStore.data.fsSearchAdditionalExtensions,
		extension,
	]);
	extensionValue = "";
}
</script>

<div class="flex flex-1 flex-col">
	<div class="flex flex-col gap-4 p-4">
		<TopBar>
			<div
				slot="input"
				class="grow flex-1 truncate text-lg font-semibold"
			>
				{$_("settings.title")}
			</div>
			<div slot="addon" role="tablist" class="join">
				<SegmentedControl items={controls} />
			</div>
		</TopBar>
		<div class="flex flex-1 flex-col mt-20 mb-8 mx-8">
			{#if currentTab === "general"}
				<form
					class="grid grid-cols-[1fr_2fr] gap-4 justify-center items-center"
				>
					<label for="toggleShortcut" class="text-sm"
						>{$_("settings.fields.shortcut")}</label
					>
					<div class="flex gap-2 items-center">
						<input
							type="hidden"
							name="toggleShortcut"
							value={toggleShortcut}
						/>
						<button type="button" id="toggleShortcut" class="btn flex-1" disabled
							>{toggleShortcut}</button
						>
						<button
							type="button"
							class="btn flex-1"
							onclick={toggleShortcutRecording}
							>{recordShortcutLabel}</button
						>
					</div>
					<label for="appVersion" class="text-sm"
						>{$_("settings.fields.version")}</label
					>
					<div class="flex gap-2 items-center">
						<button type="button" id="appVersion" class="btn flex-1" disabled
							>{packageJson.version}</button
						>
						<button
							type="button"
							class="btn flex-1"
							>{$_(
								"settings.fields.checkForUpdate",
							)}</button
						>
					</div>
					<label class="text-sm" for="themeChoice"
						>{$_("settings.fields.theme")}</label
					>
					<select
						id="themeChoice"
						name="theme"
						bind:value={settingsStore.data.theme}
						class="select select-bordered w-full"
					>
						{#each themes as theme}
							<option value={theme}
								>{humanizeString(theme)}</option
							>
						{/each}
					</select>
					<label class="text-sm" for="accentColorChoice"
						>{$_("settings.fields.accentColor")}</label
					>
					<select
						id="accentColorChoice"
						name="accentColor"
						bind:value={settingsStore.data.accentColor}
						class="select select-bordered w-full"
					>
						{#each accentColors as color}
							<option value={color}
								>{humanizeString(color)}</option
							>
						{/each}
					</select>

					<label class="text-sm" for="languageChoice"
						>{$_("settings.language")}</label
					>
					<select
						id="languageChoice"
						name="language"
						bind:value={settingsStore.data.language}
						class="select select-bordered w-full"
					>
						{#each Object.entries(LANGUAGE_NATIVE_NAME) as [code, name]}
							<option value={code}>{name}</option>
						{/each}
					</select>
					<label class="text-sm" for="clipboardChoice"
						>{$_("settings.clipboardRecordingEnabled")}</label
					>
					<input
						class="toggle toggle-primary"
						id="clipboardChoice"
						name="clipboardRecordingEnabled"
						type="checkbox"
						bind:checked={
							settingsStore.data.clipboardRecordingEnabled
						}
					/>
					<label class="text-sm" for="notesDirInput"
						>{$_("settings.fields.notesDirectory")}</label
					>
					<input
						id="notesDirInput"
						class="input w-full"
						name="notesDir"
						value={notesDirString}
						onchange={updateNotesDir}
					/>
					<label for="dangerZone" class="text-sm"
						>{$_("settings.fields.dangerZone")}</label
					>
					<div id="dangerZone">
						<button
							type="button"
							class="btn btn-warning"
							onclick={wipeLocalData}
							>{$_("settings.fields.wipeAllLocalData")}</button
						>
					</div>
				</form>
			{:else if currentTab === "search"}
				<form
					class="grid grid-cols-[1fr_2fr] gap-4 justify-center items-center"
				>
					<h2 class="font-semibold col-span-2">{$_("settings.web")}</h2>
					<label class="text-sm" for="defaultSearchEngineChoice"
						>{$_("settings.fields.defaultSearchEngine")}</label
					>
					<select
						id="defaultSearchEngineChoice"
						name="theme"
						bind:value={settingsStore.data.defaultSearchEngine}
						class="select select-bordered w-full"
					>
						{#each Object.values(SEARCH_ENGINE) as searchEngine}
							<option value={searchEngine}
								>{SEARCH_ENGINE_STYLED[searchEngine]}</option
							>
						{/each}
					</select>
					<label class="text-sm" for="baseCurrencyChoice"
						>{$_("settings.fields.baseCurrency")}</label
					>
					<select
						id="baseCurrencyChoice"
						name="baseCurrency"
						bind:value={settingsStore.data.baseCurrency}
						class="select select-bordered w-full"
					>
						{#each baseCurrencies as baseCurrency}
							<option value={baseCurrency}>{baseCurrency}</option>
						{/each}
					</select>
					<h2 class="font-semibold col-span-2">{$_("settings.file")}</h2>
					<label class="text-sm" for="fsSearchOnlyInHomeChoice"
						>{$_("settings.fields.fsSearchOnlyInHome")}</label
					>
					<input
						class="toggle toggle-primary"
						id="fsSearchOnlyInHomeChoice"
						name="fsSearchOnlyInHome"
						type="checkbox"
						bind:checked={settingsStore.data.fsSearchOnlyInHome}
					/>
					<label class="text-sm" for="fsSearchExtensionChoice"
						>{$_("settings.fields.additional_extensions")}</label
					>
					<div>
						<div class="mb-2 inline-block">
							{#each settingsStore.data.fsSearchAdditionalExtensions as extension}
								<div
								class="badge badge-outline mr-2 mb-2"
								>
								{extension}
								<button
									type="button"
									class="btn-ghost cursor-pointer"
									onclick={(e) => {
										e.preventDefault();
										settingsStore.removeFsSearchExtension(
											extension,
										);
									}}>x</button
								>
								</div>
							{/each}
						</div>
						<div class="flex gap-2">
							<input
								type="text"
								placeholder="e.g. .txt"
								class="input flex-2/3"
								bind:value={extensionValue}
								onkeydown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										addExtension();
									}
								}}
							/>

							<button
								type="button"
								class="btn flex-1/3"
								onclick={addExtension}
								>{$_("settings.fields.add")}</button
							>
						</div>
					</div>
				</form>
			{:else if currentTab === "pro"}
				<form
					class="grid grid-cols-[1fr_2fr] gap-4 justify-center items-center"
				>
					<label class="text-sm"
						>{$_("settings.fields.proAutocompleteEnabled")}</label
					>
					<input
						type="checkbox"
						bind:checked={settingsStore.data.proAutocompleteEnabled}
						class="toggle toggle-lg"
					/>
				</form>
			{:else if currentTab === "permissions"}
				<form
					class="grid grid-cols-[1fr_2fr] gap-4 justify-center items-center"
				>
					<label class="text-sm"
						>{$_("settings.fields.accessibilityPermissions")}</label
					>
					<button
						class="btn"
						disabled={settingsStore.data.accessibilityPermissions}
						onclick={requestAccessibilityPermissions}
					>
						{settingsStore.data.accessibilityPermissions ? $_("settings.fields.granted") : $_("settings.fields.requestAccessibilityPermissions")}
					</button>
					<label class="text-sm"
						>{$_("settings.fields.fsPermissions")}</label
					>
					<button
						class="btn"
						disabled={settingsStore.data.fsPermissions}
						onclick={requestFsPermissions}
					>{settingsStore.data.fsPermissions ? $_("settings.fields.granted") : $_("settings.fields.requestFsPermissions")}</button
					>
					<label class="text-sm"
						>{$_("settings.fields.autostart")}</label
					>
					<button
						class="btn"
						disabled={isAutostartEnabled}
						onclick={requestAutostartPermission}
					>
						{isAutostartEnabled ? $_("settings.fields.granted") : $_("settings.fields.requestAutostart")}
					</button>
				</form>
			{/if}
		</div>
	</div>
</div>
