<script lang="ts">
import { goto } from "$app/navigation";
import SecondaryButton from "$lib/components/secondary-button.svelte";
import SegmentedControl from "$lib/components/segmented-control.svelte";
import TopBar from "$lib/components/top-bar.svelte";
import { aiStore } from "$lib/store/ai.svelte";
import {
	ACCENT_COLOR,
	LANGUAGE,
	SEARCH_ENGINE,
	THEME,
	settingsStore,
} from "$lib/store/settings.svelte";
import { clsx } from "clsx";
import humanizeString from "humanize-string";
import { PressedKeys, watch } from "runed";
import { _ } from "svelte-i18n";
import packageJson from "../../../package.json" with { type: "json" };

const pressedKeys = new PressedKeys();

const tabs = [
	{ label: $_("settings.tabs.general"), value: "general", hotkey: "⌘1" },
	{ label: $_("settings.tabs.ai"), value: "ai", hotkey: "⌘2" },
	{ label: $_("settings.tabs.notes"), value: "notes", hotkey: "⌘3" },
];

let newToggleShortcut = $state<string[]>([]);
let recordingShortcut = $state(false);
let connectionStatus = $state<{
	status: "loading" | "error" | "success";
	text?: string;
} | null>(null);
let currentTab = $state("general");
const themes = Object.keys(THEME);
const searchEngines = Object.keys(SEARCH_ENGINE);
const accentColors = Object.keys(ACCENT_COLOR);
const languages = [
	{ code: LANGUAGE.EN, name: $_("settings.languages.EN") },
	{ code: LANGUAGE.PL, name: $_("settings.languages.PL") },
	{ code: LANGUAGE.DE, name: $_("settings.languages.DE") },
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

function updateNotesDir(event: any) {
	const notesDirSplit = event.target.value.split("/");
	return settingsStore.setNotesDir(notesDirSplit);
}

const notesDirString = $derived(settingsStore.data.notesDir.join("/"));

async function wipeLocalData() {
	await settingsStore.wipeLocalData();
	return goto("/");
}

async function testConnection() {
	connectionStatus = {
		status: "loading",
		text: $_("settings.fields.testingConnection"),
	};
	const result = await aiStore.testConnection();
	connectionStatus = {
		status: result.success ? "success" : "error",
		text: result.message,
	};
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
</script>

<div class="flex flex-1 flex-col">
  <TopBar>
    <div slot="input" class="grow flex-1 truncate text-lg font-semibold">{$_("settings.title")}</div>
    <div slot="addon" role="tablist" class="join">
      <SegmentedControl
        items={tabs.map((tab, index) => ({
          text: $_(tab.label),
          onClick: () => changeTab(tab.value),
          active: currentTab === tab.value,
          shortcut: isCmdPressed ? tab.hotkey : undefined
        }))}
      />
    </div>
  </TopBar>
   <div class="flex flex-1 flex-col mt-20 mb-8 mx-4">
    {#if currentTab === 'general'}
      <form class="grid grid-cols-[1fr_2fr] gap-4 justify-center items-center">
        <label class="text-sm">{$_("settings.fields.shortcut")}</label>
        <div class="flex gap-2 items-center">
          <input type="hidden" name="toggleShortcut" value={toggleShortcut} />
          <SecondaryButton class="flex-1" disabled>{toggleShortcut}</SecondaryButton>
          <SecondaryButton class="flex-1" onclick={toggleShortcutRecording}>{recordShortcutLabel}</SecondaryButton>
        </div>
        <label class="text-sm">{$_("settings.fields.version")}</label>
        <div class="flex gap-2 items-center">
          <SecondaryButton class="flex-1" disabled>{packageJson.version}</SecondaryButton>
          <SecondaryButton class="flex-1">{$_("settings.fields.checkForUpdate")}</SecondaryButton>
        </div>
        <label class="text-sm">{$_("settings.fields.theme")}</label>
        <select name="theme" bind:value={settingsStore.data.theme} class="select select-bordered w-full">
        	{#each themes as theme}
          	<option value={theme}>{humanizeString(theme)}</option>
          {/each}
        </select>
		<label class="text-sm">{$_("settings.fields.defaultSearchEngine")}</label>
        <select name="theme" bind:value={settingsStore.data.defaultSearchEngine} class="select select-bordered w-full">
        	{#each searchEngines as searchEngine}
          	<option value={searchEngine}>{humanizeString(searchEngine)}</option>
          {/each}
        </select>
        <label class="text-sm">{$_("settings.fields.accentColor")}</label>
        <select name="accentColor" bind:value={settingsStore.data.accentColor} class="select select-bordered w-full">
        	{#each accentColors as color}
          	<option value={color}>{humanizeString(color)}</option>
          {/each}
        </select>
        <label class="text-sm">{$_("settings.language")}</label>
        <select name="language" bind:value={settingsStore.data.language} class="select select-bordered w-full">
        	{#each languages as language}
          	<option value={language.code}>{$_(`settings.languages.${language.code}`)}</option>
          {/each}
        </select>
        <label class="text-sm">{$_("settings.fields.dangerZone")}</label>
        <button type="button" class="btn btn-warning" onclick={wipeLocalData}>{$_("settings.fields.wipeAllLocalData")}</button>
      </form>
    {:else if currentTab === 'ai'}
      <form class="grid grid-cols-[1fr_2fr] gap-4 justify-center items-center"> 
        <label class="text-sm">{$_("settings.fields.ai.modelName")}</label>
        <input class="input w-full" name="modelName" placeholder="gpt-4o" bind:value={settingsStore.data.aiModelName} />
        <label class="text-sm">{$_("settings.fields.ai.customEndpoint")}</label>
        <input class="input w-full" name="endpointUrl" placeholder="https://api.openai.com/v1" bind:value={settingsStore.data.aiEndpointUrl} />
        <label class="text-sm">{$_("settings.fields.ai.tokenSecret")}</label>
        <input class="input w-full" type="password" name="secretKey" bind:value={settingsStore.data.aiSecretKey} />
        <label class="text-sm">{$_("settings.fields.ai.additionalContext")}</label>
        <textarea class="textarea w-full resize-none" placeholder="{$_("additionalContextPlaceholder")}" bind:value={settingsStore.data.aiAdditionalContext} />
        <span></span>
        <div>
        <button type="button" class="btn btn-warning w-[100%]" onclick={testConnection}>{$_("settings.fields.ai.testConnection")}</button>
        <div class={clsx("text-sm text-center mt-2", {
          "text-success": connectionStatus?.status === "success",
          "text-error": connectionStatus?.status === "error"
        })}>{connectionStatus?.text}</div>
      </div>
    
      </form>
    {:else if currentTab === 'notes'}
      <form class="grid grid-cols-[1fr_2fr] gap-4 justify-center items-center">
        <label class="text-sm">{$_("settings.fields.notes.aiEnabled")}</label>
        <input type="checkbox" bind:checked={settingsStore.data.notesAiEnabled} class="toggle toggle-lg" />
        <label class="text-sm">{$_("settings.fields.notes.notesDirectory")}</label>
        <input class="input w-full" name="notesDir" value={notesDirString} onchange={updateNotesDir} />
      </form>
    {/if}
  </div>
</div>
