<script lang="ts">
import { goto } from "$app/navigation";
import TopBar from "$lib/components/top-bar.svelte";
import { aiStore } from "$lib/store/ai.svelte";
import { ACCENT_COLOR, THEME, settingsStore } from "$lib/store/settings.svelte";
import { clsx } from "clsx";
import humanizeString from "humanize-string";
import { PressedKeys, watch } from "runed";
import packageJson from "../../../package.json" with { type: "json" };

const pressedKeys = new PressedKeys();

const tabs = [
	{ label: "General", value: "general", hotkey: "⌘1" },
	{ label: "AI", value: "ai", hotkey: "⌘2" },
	{ label: "Notes", value: "notes", hotkey: "⌘3" },
];


let newToggleShortcut = $state<string[]>([]);
let recordingShortcut = $state(false);
let connectionStatus = $state<{ status: 'loading' | 'error' | 'success'; text?: string; } | null>(null);
let currentTab = $state("general");
let additionalContextPlaceholder = 'Additional context for note generation.\r\ne.g. "Respond in professional style. Be concise".'
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
	recordingShortcut ? "Press to save" : "Press to change",
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

const notesDirString = $derived(settingsStore.settings.notesDir.join("/"));

async function wipeLocalData() {
	await settingsStore.wipeLocalData();
	return goto("/");
}

async function testConnection() {
  connectionStatus = { status: 'loading', text: 'Testing connection...' };
  const result = await aiStore.testConnection();
  connectionStatus = { status: result.success ? 'success' : 'error', text: result.message };
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
	() => $state.snapshot(settingsStore.settings),
	() => {
		settingsStore.persist();
	},
);

const isCmdPressed = $derived(pressedKeys.has("Meta"));
</script>

<div class="flex flex-1 flex-col">
  <TopBar>
    <div slot="input" class="grow flex-1 truncate text-lg font-semibold">Settings</div>
    <div slot="addon" role="tablist" class="join">
      {#each tabs as tab, index}
      	{@const active = currentTab === tab.value}
      	{@const hotkey = `Meta+${index + 1}`}
        <button type="button" class={clsx("btn join-item", active && 'text-primary')} onclick={() => changeTab(tab.value)} data-hotkey={hotkey}>
        	<span>{tab.label}</span>
        	{#if isCmdPressed}
	        	<span>{tab.hotkey}</span>
        	{/if}
        </button>
      {/each}
    </div>
  </TopBar>
   <div class="flex flex-1 flex-col mt-20 mb-8 mx-4">
    {#if currentTab === 'general'}
      <form class="grid grid-cols-[1fr_2fr] gap-4 justify-center items-center">
        <label class="text-sm">Shortcut</label>
        <div class="flex gap-2 items-center">
          <input type="hidden" name="toggleShortcut" value={toggleShortcut} />
          <button type="button" class="btn flex-1" disabled>{toggleShortcut}</button>
          <button type="button" class="btn flex-1" onclick={toggleShortcutRecording}>{recordShortcutLabel}</button>
        </div>
        <label class="text-sm">Version</label>
        <div class="flex gap-2 items-center">
          <button type="button" class="btn flex-1" disabled>{packageJson.version}</button>
          <button type="button" class="btn flex-1">Check for update</button>
        </div>
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
        <label class="text-sm">Danger Zone</label>
        <button type="button" class="btn btn-warning" onclick={wipeLocalData}>Wipe All Local Data</button>
      </form>
    {:else if currentTab === 'ai'}
      <form class="grid grid-cols-[1fr_2fr] gap-4 justify-center items-center"> 
        <label class="text-sm">Model Name</label>
        <input class="input w-full" name="modelName" placeholder="gpt-4o" bind:value={settingsStore.settings.aiModelName} />
        <label class="text-sm">Custom Endpoint</label>
        <input class="input w-full" name="endpointUrl" placeholder="https://api.openai.com/v1/chat/completions" bind:value={settingsStore.settings.aiEndpointUrl} />
        <label class="text-sm">Token Secret</label>
        <input class="input w-full" type="password" name="secretKey" bind:value={settingsStore.settings.aiSecretKey} />
        <label class="text-sm">Additional Context</label>
        <textarea class="textarea w-full resize-none" placeholder="{additionalContextPlaceholder}" bind:value={settingsStore.settings.aiAdditionalContext} />
        <span></span>
        <div>
        <button type="button" class="btn btn-warning w-[100%]" onclick={testConnection}>Test Connection</button>
        <div class={clsx("text-sm text-center mt-2", {
          "text-success": connectionStatus?.status === "success",
          "text-error": connectionStatus?.status === "error"
        })}>{connectionStatus?.text}</div>
      </div>
    
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
