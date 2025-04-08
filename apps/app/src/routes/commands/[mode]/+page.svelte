<script lang="ts">
import { goto } from "$app/navigation";
import { page } from "$app/state";
import CommandList from "$lib/components/command-list.svelte";
import SearchBar from "$lib/components/search-bar.svelte";
import ViewActions from "$lib/components/view-actions.svelte";
import Widgets from "$lib/components/widgets.svelte";
import { appStore } from "$lib/store/app.svelte";
import { commandsStore } from "$lib/store/commands.svelte";
import { notesStore } from "$lib/store/notes.svelte";
import { APP_MODE } from "@getgrinta/core";
import { _ } from "svelte-i18n";

async function createNote() {
	const filename = await notesStore.createNote(
		appStore.query.length > 0 ? appStore.query : undefined,
	);
	return goto(`/notes/${filename}`);
}

const notesViewActions = [
	{ label: $_("notes.createNote"), onclick: createNote, shortcut: "⌘N" },
];

$effect(() => {
	appStore.switchMode(page.params.mode);
	commandsStore.scrollTop = 0;
});
</script>

<div class="flex flex-1 flex-col gap-1">
	<SearchBar />
	<div class="flex flex-col relative">
		<Widgets />
		<CommandList />
	</div>
	{#if appStore.appMode !== APP_MODE.MENU}
		<div class="flex fixed bottom-4 right-4 left-4 justify-end pointer-events-none">
			{#if appStore.appMode === APP_MODE.NOTES}
				<ViewActions actions={notesViewActions} />
			{/if}
		</div>
	{/if}
</div>
