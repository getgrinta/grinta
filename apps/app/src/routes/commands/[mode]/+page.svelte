<script lang="ts">
import { goto } from "$app/navigation";
import { page } from "$app/state";
import { appStore } from "$lib/store/app.svelte";
import { notesStore } from "$lib/store/notes.svelte";

async function createNote() {
	const filename = await notesStore.createNote(
		appStore.query.length > 0 ? appStore.query : undefined,
	);
	return goto(`/notes/${filename}`);
}

const _viewActions = [
	{ label: $_("notes.createNote"), onclick: createNote, shortcut: "⌘N" },
];

$effect(() => {
	appStore.switchMode(page.params.mode);
});
</script>

<div class="flex flex-1 flex-col gap-1">
  <SearchBar />
  <CommandList />
  {#if appStore.barMode !== BAR_MODE.MENU}
	<div class="flex fixed bottom-4 right-4 left-4 justify-end">
		{#if appStore.barMode === BAR_MODE.INITIAL}
			<SearchModeToggle />
		{:else}
			<ViewActions actions={viewActions} />
		{/if}
	</div>
  {/if}
</div>
