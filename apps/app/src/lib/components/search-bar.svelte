<script lang="ts">
import { goto } from "$app/navigation";
import AiNoteIcon from "$lib/assets/ai-note.svelte";
import GrintaIcon from "$lib/assets/grinta.svelte";
import TopBar from "$lib/components/top-bar.svelte";
import { BAR_MODE, type BarMode, appStore } from "$lib/store/app.svelte";
import { commandsStore } from "$lib/store/commands.svelte";
import { notesStore } from "$lib/store/notes.svelte";
import { generateText } from "ai";
import { clsx } from "clsx";
import { createForm } from "felte";
import {
	MenuIcon,
	PlusIcon,
	SearchIcon,
	SparklesIcon,
	StickyNoteIcon,
	XIcon,
} from "lucide-svelte";
import { PressedKeys } from "runed";
import { onMount } from "svelte";
import { _ } from "svelte-i18n";
import { fly } from "svelte/transition";
import { match } from "ts-pattern";

const pressedKeys = new PressedKeys();

const QUICK_MODE_SWITCH = [BAR_MODE.INITIAL, BAR_MODE.NOTES];

const INDICATOR_MODES = [
	{ value: BAR_MODE.INITIAL, icon: GrintaIcon, shortcut: "⌘1" },
	{ value: BAR_MODE.NOTES, icon: AiNoteIcon, shortcut: "⌘2" },
	{ value: BAR_MODE.MENU, icon: MenuIcon, shortcut: "⌘K" },
];

const isCmdPressed = $derived(pressedKeys.has("Meta"));

const { form } = createForm({
	async onSubmit(values) {
		return commandsStore.handleCommand(undefined);
	},
});

function getSearchInputElement(): HTMLInputElement | null {
	return document.querySelector("#queryInput");
}

function getCommandElement(index: number) {
	return document.querySelector(`[data-command-index="${index}"]`);
}

function scrollElementIntoView(index: number) {
	const element = getCommandElement(index);
	return element?.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function switchMode(mode: BarMode) {
	return goto(`/commands/${mode}`);
}

function switchModeNext() {
	const index = QUICK_MODE_SWITCH.findIndex(
		(mode) => mode === appStore.barMode,
	);
	const nextMode =
		index === QUICK_MODE_SWITCH.length - 1
			? QUICK_MODE_SWITCH[0]
			: QUICK_MODE_SWITCH[index + 1];
	return switchMode(nextMode);
}

function switchModePrevious() {
	const index = QUICK_MODE_SWITCH.findIndex(
		(mode) => mode === appStore.barMode,
	);
	const previousMode =
		index === 0
			? QUICK_MODE_SWITCH[QUICK_MODE_SWITCH.length - 1]
			: QUICK_MODE_SWITCH[index - 1];
	return switchMode(previousMode);
}

async function createNote() {
	const filename = await notesStore.createNote(
		appStore.query.length > 0 ? appStore.query : undefined,
	);
	return goto(`/notes/${filename}`);
}

async function handleNavigation(event: KeyboardEvent) {
	if (event.key === "ArrowDown" || (event.key === "j" && event.ctrlKey)) {
		event.preventDefault();
		if (commandsStore.selectedIndex === undefined) return;
		if (commandsStore.selectedIndex === commandsStore.commands.length - 1) {
			commandsStore.selectedIndex = 0;
			return;
		}
		commandsStore.selectedIndex = commandsStore.selectedIndex + 1;
		scrollElementIntoView(commandsStore.selectedIndex);
		return;
	}
	if (event.key === "ArrowUp" || (event.key === "k" && event.ctrlKey)) {
		event.preventDefault();
		if (commandsStore.selectedIndex === undefined) return;
		if (commandsStore.selectedIndex === 0) {
			commandsStore.selectedIndex = commandsStore.commands.length - 1;
			return;
		}
		commandsStore.selectedIndex = commandsStore.selectedIndex - 1;
		scrollElementIntoView(commandsStore.selectedIndex);
		return;
	}
	if (event.key === "j" && event.metaKey) {
		event.preventDefault();
		return switchModeNext();
	}
	if (event.key === "Escape") {
		event.preventDefault();
		if (appStore.barMode !== BAR_MODE.INITIAL) {
			return switchMode(BAR_MODE.INITIAL);
		}
		return appStore.appWindow?.hide();
	}
	if (event.key === "Backspace" && appStore.query.length === 0) {
		appStore.barMode = BAR_MODE.INITIAL;
		return;
	}
	if (event.key === "k" && event.metaKey) {
		event.preventDefault();
		const shouldGoBack = appStore.barMode === BAR_MODE.MENU;
		if (shouldGoBack) return window.history.back();
		return switchMode(BAR_MODE.MENU);
	}
	if (event.key === "n" && event.metaKey) {
		return createNote();
	}
	if (event.key === "1" && event.metaKey) {
		return switchMode(BAR_MODE.INITIAL);
	}
	if (event.key === "2" && event.metaKey) {
		return switchMode(BAR_MODE.NOTES);
	}
}

$effect(() => {
	commandsStore.buildCommands(appStore.query);
});

$effect(() => {
	if (appStore.query === "@") {
		return switchMode(BAR_MODE.NOTES);
	}
});

const inputProps = $derived(
	match(appStore.barMode)
		.with(BAR_MODE.INITIAL, () => ({
			icon: SearchIcon,
			placeholder: $_("searchBar.placeholder.initial"),
		}))
		.with(BAR_MODE.MENU, () => ({
			icon: MenuIcon,
			placeholder: $_("searchBar.placeholder.menu"),
		}))
		.with(BAR_MODE.NOTES, () => ({
			icon: StickyNoteIcon,
			placeholder: $_("searchBar.placeholder.notes"),
		}))
		.exhaustive(),
);

const MENU_BUTTON = {
	label: $_("searchBar.actions.menu"),
	icon: MenuIcon,
	shortcut: "⌘K",
	action: () => switchMode(BAR_MODE.MENU),
};

const actionButton = $derived(
	match(appStore.barMode)
		.with(BAR_MODE.MENU, () => ({
			label: $_("searchBar.actions.exitMenu"),
			icon: XIcon,
			shortcut: "⌘K",
			action: () => switchMode(BAR_MODE.INITIAL),
		}))
		.with(BAR_MODE.NOTES, () => ({
			label: $_("searchBar.actions.createNote"),
			icon: PlusIcon,
			shortcut: "⌘N",
			action: createNote,
		}))
		.otherwise(() => MENU_BUTTON),
);
</script>

<form use:form>
	<TopBar>
		<div slot="indicator" class="hidden"></div>
    <input
      id="queryInput"
      slot="input"
      class="grow font-semibold text-lg !outline-none"
      name="query"
      bind:value={appStore.query}
      onkeydown={handleNavigation}
      placeholder={inputProps.placeholder}
      autocomplete="off"
      autofocus
    />
  	<div slot="addon" class="join">
  		{#each INDICATOR_MODES as mode, i}
  			{@const active = mode.value === appStore.barMode}
			  <button type="button" onclick={() => switchMode(mode.value)} class={clsx("btn btn-sm join-item border-neutral-800", active ? "text-primary bg-base-300" : "text-neutral-500")}>
		  		<mode.icon size={24} class="w-6 h-6" />
		  		{#if isCmdPressed}
			  		<span>{mode.shortcut}</span>
		  		{/if}
	  		</button>
  		{/each}
		</div>
	</TopBar>
</form>
