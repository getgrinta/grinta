<script lang="ts">
import { goto } from "$app/navigation";
import AiNoteIcon from "$lib/assets/ai-note.svelte";
import GrintaIcon from "$lib/assets/grinta.svelte";
import SegmentedControl from "$lib/components/segmented-control.svelte";
import TopBar from "$lib/components/top-bar.svelte";
import { toggleVisibility } from "$lib/grinta-invoke";
import { appMetadataStore } from "$lib/store/app-metadata.svelte";
import { BAR_MODE, type BarMode, appStore } from "$lib/store/app.svelte";
import { commandsStore } from "$lib/store/commands.svelte";
import { notesStore } from "$lib/store/notes.svelte";
import { settingsStore } from "$lib/store/settings.svelte";
import { listen } from "@tauri-apps/api/event";
import { clsx } from "clsx";
import { createForm } from "felte";
import {
	ChevronLeftIcon,
	ClipboardIcon,
	EyeIcon,
	EyeOffIcon,
	MenuIcon,
	SearchIcon,
	StickyNoteIcon,
} from "lucide-svelte";
import { watch } from "runed";
import { _ } from "svelte-i18n";
import { match } from "ts-pattern";

let queryInput: HTMLInputElement;

const INDICATOR_MODES = [
	{ value: BAR_MODE.INITIAL, icon: GrintaIcon, shortcut: "⌘1" },
	{ value: BAR_MODE.NOTES, icon: AiNoteIcon, shortcut: "⌘2" },
	{ value: BAR_MODE.MENU, icon: MenuIcon, shortcut: "⌘K" },
];

const { form } = createForm({
	async onSubmit() {
		return commandsStore.handleCommand(commandsStore.currentCommand);
	},
});

function getCommandElement(index: number) {
	return document.querySelector(`[data-command-index="${index}"]`);
}

function scrollElementIntoView(index: number) {
	const element = getCommandElement(index);
	return element?.scrollIntoView({
		block: "nearest",
		behavior: "smooth",
	});
}

listen("focus", () => {
	queryInput?.focus();

	if (appStore.barMode !== BAR_MODE.INITIAL) {
		switchMode(BAR_MODE.INITIAL);
	}
});

function switchMode(mode: BarMode) {
	return goto(`/commands/${mode}`);
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
	if (event.key === "Escape") {
		event.preventDefault();
		if (appStore.barMode !== BAR_MODE.INITIAL) {
			return switchMode(BAR_MODE.INITIAL);
		}
		toggleVisibility();
	}
	if (event.key === "Backspace" && appStore.query.length === 0) {
		appStore.barMode = BAR_MODE.INITIAL;
		return;
	}
	if (event.key === "j" && event.metaKey) {
		return appStore.toggleSearchMode();
	}
	if (event.key === "k" && event.metaKey) {
		event.preventDefault();
		const shouldGoBack = appStore.barMode === BAR_MODE.MENU;
		if (shouldGoBack) return window.history.back();
		return switchMode(BAR_MODE.MENU);
	}
	if (event.key === "p" && event.metaKey) {
		return settingsStore.toggleIncognito();
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

async function buildCommands() {
	return commandsStore.buildCommands({
		isRefresh: false,
	});
}

async function buildAppCommandsAndAppIcons() {
	await commandsStore.buildAppCommands();
	await commandsStore.buildCommands({
		isRefresh: true,
	});
}

watch(
	() => [appStore.query, appStore.searchMode, appStore.barMode],
	() => {
		buildCommands();
	},
);

watch(
	() => appMetadataStore.appInfo.length,
	() => {
		buildAppCommandsAndAppIcons();
	},
);

watch(
	() => appStore.searchMode,
	() => {
		queryInput?.focus();
	},
);

$effect(() => {
	if (appStore.query === "@") {
		switchMode(BAR_MODE.NOTES);
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
		.with(BAR_MODE.CLIPBOARD, () => ({
			icon: ClipboardIcon,
			placeholder: $_("searchBar.placeholder.clipboard"),
		}))
		.exhaustive(),
);

const indicatorButton = $derived(
	match(appStore.barMode)
		.with(BAR_MODE.INITIAL, () =>
			settingsStore.data.incognitoEnabled
				? {
						icon: EyeOffIcon,
						onClick: () => settingsStore.toggleIncognito(),
						active: true,
						hotkey: "Mod+p",
					}
				: {
						icon: EyeIcon,
						onClick: () => settingsStore.toggleIncognito(),
						active: false,
						hotkey: "Mod+p",
					},
		)
		.otherwise(() => ({
			icon: ChevronLeftIcon,
			onClick: () => goto("/commands/INITIAL"),
			active: false,
			hotkey: "Mod+p",
		})),
);
</script>

<form use:form>
	<TopBar>
		<div slot="indicator">
			<button 
				type="button"
				class={clsx("btn btn-sm", indicatorButton.active && "btn-primary")}
				onclick={indicatorButton.onClick}
			>
				<indicatorButton.icon
					size={16}
					class={clsx(
						"pointer-events-none",
					)}
				/>
			</button>
		</div>
		<input
			bind:this={queryInput}
			id="search-bar"
			slot="input"
			class="grow font-semibold text-lg !outline-none"
			name="query"
			bind:value={appStore.query}
			onkeydown={handleNavigation}
			placeholder={inputProps.placeholder}
			autocomplete="off"
			data-testid="search-bar"
			autofocus
		/>
		<div slot="addon">
			<SegmentedControl
				items={INDICATOR_MODES.map((mode) => ({
					text: $_(`barMode.${mode.value.toLowerCase()}`),
					icon: mode.icon,
					active: mode.value === appStore.barMode,
					shortcut: mode.shortcut,
					testId: `search-bar-mode-${mode.value.toLowerCase()}`,
					onClick: () => switchMode(mode.value),
				}))}
				hidingLabels
			/>
		</div>
	</TopBar>
</form>
