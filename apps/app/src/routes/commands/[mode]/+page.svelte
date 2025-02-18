<script lang="ts">
import { goto } from "$app/navigation";
import { page } from "$app/state";
import CommandList from "$lib/components/command-list.svelte";
import SearchBar from "$lib/components/search-bar.svelte";
import ViewActions from "$lib/components/view-actions.svelte";
import { BAR_MODE, appStore } from "$lib/store/app.svelte";
import { notesStore } from "$lib/store/notes.svelte";

async function createNote() {
	const filename = await notesStore.createNote(
		appStore.query.length > 0 ? appStore.query : undefined,
	);
	return goto(`/notes/${filename}`);
}

const viewActions = [
	{ label: "Create Note", onclick: createNote, shortcut: "⌘N" },
];

const showActions = $derived(appStore.barMode === BAR_MODE.NOTES);

$effect(() => {
	appStore.switchMode(page.params.mode);
});
</script>

<div class="flex flex-1 flex-col gap-1">
  <SearchBar />
  <CommandList />
  {#if showActions}
	  <ViewActions actions={viewActions} />
  {/if}
</div>
