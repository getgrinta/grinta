<script lang="ts">
import { goto } from "$app/navigation";
import PrimaryButton from "$lib/components/primary-button.svelte";
import SegmentedControl from "$lib/components/segmented-control.svelte";
import TopBar from "$lib/components/top-bar.svelte";
import { appStore } from "$lib/store/app.svelte";
import {
	ACCENT_COLOR,
	LANGUAGE,
	SEARCH_ENGINE,
	THEME,
	baseCurrencies,
	settingsStore,
} from "$lib/store/settings.svelte";
import humanizeString from "humanize-string";
import { PressedKeys, watch } from "runed";
import { _ } from "svelte-i18n";
import packageJson from "../../../package.json" with { type: "json" };

const pressedKeys = new PressedKeys();

const baseTabs = [
	{ label: $_("settings.tabs.general"), value: "general", hotkey: "⌘1" },
	{ label: $_("settings.tabs.search"), value: "search", hotkey: "⌘2" },
];

const proTabs = [
	...baseTabs,
	{ label: $_("settings.tabs.pro"), value: "pro", hotkey: "⌘3" },
];

const tabs = $derived(appStore.subscriptions.length > 0 ? proTabs : baseTabs);

let newToggleShortcut = $state<string[]>([]);
let recordingShortcut = $state(false);
let currentTab = $state("general");
const themes = Object.keys(THEME);
const searchEngines = Object.keys(SEARCH_ENGINE);
const accentColors = Object.keys(ACCENT_COLOR);
const languages = [
	{ code: LANGUAGE.EN, name: "English" },
	{ code: LANGUAGE.PL, name: "Polski" },
	{ code: LANGUAGE.DE, name: "Deutsch" },
];

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

$effect(() => {
	if (!recordingShortcut) return;
	const newShortcut = pressedKeys.all;
	if (newShortcut.length <= newToggleShortcut.length) return;
	newToggleShortcut = newShortcut;
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
	() => {
		settingsStore.persist();
	},
);

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
</script>

<div class="flex flex-1 flex-col">
  <TopBar>
    <div slot="input" class="grow flex-1 truncate text-lg font-semibold">{$_("settings.title")}</div>
    <div slot="addon" role="tablist" class="join">
      <SegmentedControl
        size="lg"
        items={controls}
      />
    </div>
  </TopBar>
   <div class="flex flex-1 flex-col mt-24 mb-8 mx-8">
    {#if currentTab === 'general'}
      <form class="grid grid-cols-[1fr_2fr] gap-4 justify-center items-center">
        <label class="text-sm">{$_("settings.fields.shortcut")}</label>
        <div class="flex gap-2 items-center">
          <input type="hidden" name="toggleShortcut" value={toggleShortcut} />
          <PrimaryButton class="flex-1" disabled>{toggleShortcut}</PrimaryButton>
          <PrimaryButton class="flex-1" onclick={toggleShortcutRecording}>{recordShortcutLabel}</PrimaryButton>
        </div>
        <label class="text-sm">{$_("settings.fields.version")}</label>
        <div class="flex gap-2 items-center">
          <PrimaryButton class="flex-1" disabled>{packageJson.version}</PrimaryButton>
          <PrimaryButton class="flex-1">{$_("settings.fields.checkForUpdate")}</PrimaryButton>
        </div>
        <label class="text-sm" for="themeChoice">{$_("settings.fields.theme")}</label>
        <select id="themeChoice" name="theme" bind:value={settingsStore.data.theme} class="select select-bordered w-full">
        	{#each themes as theme}
          	<option value={theme}>{humanizeString(theme)}</option>
          {/each}
        </select>
        <label class="text-sm" for="accentColorChoice">{$_("settings.fields.accentColor")}</label>
        <select id="accentColorChoice" name="accentColor" bind:value={settingsStore.data.accentColor} class="select select-bordered w-full">
        	{#each accentColors as color}
          	<option value={color}>{humanizeString(color)}</option>
          {/each}
        </select>
        <label class="text-sm" for="languageChoice">{$_("settings.language")}</label>
        <select id="languageChoice" name="language" bind:value={settingsStore.data.language} class="select select-bordered w-full">
        	{#each languages as language}
          	<option value={language.code}>{language.name}</option>
          {/each}
        </select>
		<label class="text-sm" for="notesDirInput">{$_("settings.fields.notesDirectory")}</label>
        <input id="notesDirInput" class="input w-full" name="notesDir" value={notesDirString} onchange={updateNotesDir} />
        <label class="text-sm">{$_("settings.fields.dangerZone")}</label>
        <button type="button" class="btn btn-warning" onclick={wipeLocalData}>{$_("settings.fields.wipeAllLocalData")}</button>
      </form>
	{:else if currentTab === 'search'}
	  <form class="grid grid-cols-[1fr_2fr] gap-4 justify-center items-center">
		<label class="text-sm" for="defaultSearchEngineChoice">{$_("settings.fields.defaultSearchEngine")}</label>
        <select id="defaultSearchEngineChoice" name="theme" bind:value={settingsStore.data.defaultSearchEngine} class="select select-bordered w-full">
        	{#each searchEngines as searchEngine}
          	<option value={searchEngine}>{humanizeString(searchEngine)}</option>
          {/each}
        </select>
		<label class="text-sm" for="baseCurrencyChoice">{$_("settings.fields.baseCurrency")}</label>
        <select id="baseCurrencyChoice" name="baseCurrency" bind:value={settingsStore.data.baseCurrency} class="select select-bordered w-full">
        	{#each baseCurrencies as baseCurrency}
          	<option value={baseCurrency}>{baseCurrency}</option>
          {/each}
        </select>
	  </form>
    {:else if currentTab === 'pro'}
      <form class="grid grid-cols-[1fr_2fr] gap-4 justify-center items-center">
        <label class="text-sm">{$_("settings.fields.proAutocompleteEnabled")}</label>
        <input type="checkbox" bind:checked={settingsStore.data.proAutocompleteEnabled} class="toggle toggle-lg" />
      </form>
    {/if}
  </div>
</div>
