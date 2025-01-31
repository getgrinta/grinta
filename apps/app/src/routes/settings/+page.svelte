<script lang="ts">
import { goto } from "$app/navigation";
import TopBar from "$lib/components/top-bar.svelte";
import { ACCENT_COLOR, THEME, settingsStore } from "$lib/store/settings.svelte";
import { clsx } from "clsx";
import humanizeString from "humanize-string";
import { PressedKeys, watch } from "runed";
import packageJson from "../../../package.json" with { type: "json" };

const pressedKeys = new PressedKeys();

const tabs = [
	{ label: "General ⌘1", value: "general" },
	{ label: "AI ⌘2", value: "ai" },
	{ label: "Notes ⌘3", value: "notes" },
];

let newToggleShortcut = $state<string[]>([]);
let recordingShortcut = $state(false);
let currentTab = $state("general");
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
		: settingsStore.settings.toggleShortcut,
);

const recordShortcutLabel = $derived(
	recordingShortcut
		? `${toggleShortcut} (Press to save)`
		: `${toggleShortcut} (Press to change)`,
);

function processShortcut(keys: string[]) {
	return keys
		.map((key) => {
			if (key === "meta") return "CommandOrControl";
			if (key === "space") return "Space";
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

const notesDirString = $derived(settingsStore.settings.notesDir.join("/"));

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
	if (newToggleShortcut.length < 2) return;
	if (pressedKeys.all.length !== 0) return;
	const processedShortcut = processShortcut(newToggleShortcut);
	settingsStore.setToggleShortcut(processedShortcut);
	settingsStore.persist();
	toggleShortcutRecording();
});

watch(
	() => $state.snapshot(settingsStore.settings),
	() => {
		settingsStore.persist();
	},
);
</script>

<div class="flex flex-1 flex-col">
  <TopBar>
    <div slot="input" class="grow flex-1 truncate text-lg font-semibold">Settings</div>
    <div slot="addon" role="tablist" class="tabs tabs-box">
      {#each tabs as tab, index}
      	{@const hotkey = `Meta+${index + 1}`}
        <a role="tab" class={clsx("tab", currentTab === tab.value && 'tab-active')} onclick={() => changeTab(tab.value)} data-hotkey={hotkey}>{tab.label}</a>
      {/each}
    </div>
  </TopBar>
   <div class="flex flex-1 flex-col mt-20 mb-8 mx-4">
    {#if currentTab === 'general'}
      <form class="grid grid-cols-[1fr_2fr] gap-4 justify-center items-center">
        <label class="text-sm">Shortcut</label>
        <input type="hidden" name="toggleShortcut" value={toggleShortcut} />
        <button type="button" class="btn justify-start" onclick={toggleShortcutRecording}>{recordShortcutLabel}</button>
        <label class="text-sm">Theme</label>
        <select name="theme" bind:value={settingsStore.settings.theme} class="select select-bordered w-full">
        	{#each themes as theme}
          	<option value={theme}>{humanizeString(theme)}</option>
          {/each}
        </select>
        <label class="text-sm">Accent Color</label>
        <select name="accentColor" bind:value={settingsStore.settings.accentColor} class="select select-bordered w-full">
        	{#each accentColors as color}
          	<option value={color}>{humanizeString(color)}</option>
          {/each}
        </select>
        <label class="text-sm">Version</label>
        <div class="flex gap-2 items-center">
          <button type="button" class="btn flex-1" disabled>{packageJson.version}</button>
          <button type="button" class="btn flex-1">Check for update</button>
        </div>
        <label class="text-sm">Danger Zone</label>
        <button type="button" class="btn btn-warning" onclick={wipeLocalData}>Wipe All Local Data</button>
      </form>
    {:else if currentTab === 'ai'}
      <form class="grid grid-cols-[1fr_2fr] gap-4 justify-center items-center"> 
        <label class="text-sm">Model Name</label>
        <input class="input w-full" name="modelName" bind:value={settingsStore.settings.aiModelName} />
        <label class="text-sm">Custom Endpoint</label>
        <input class="input w-full" name="endpointUrl" bind:value={settingsStore.settings.aiEndpointUrl} />
        <label class="text-sm">Token Secret</label>
        <input class="input w-full" type="password" name="secretKey" bind:value={settingsStore.settings.aiSecretKey} />
        <label class="text-sm">Additional Context</label>
        <textarea class="textarea w-full resize-none" bind:value={settingsStore.settings.aiAdditionalContext} />
      </form>
    {:else if currentTab === 'notes'}
      <form class="grid grid-cols-[1fr_2fr] gap-4 justify-center items-center">
        <label class="text-sm">AI Enabled</label>
        <input type="checkbox" bind:checked={settingsStore.settings.notesAiEnabled} class="toggle toggle-lg" />
        <label class="text-sm">Notes Directory</label>
        <input class="input w-full" name="notesDir" value={notesDirString} onchange={updateNotesDir} />
      </form>
    {/if}
  </div>
</div>
