<script lang="ts">
import { goto, replaceState } from "$app/navigation";
import { page } from "$app/stores";
import NoteEditor from "$lib/components/note-editor.svelte";
import TopBar from "$lib/components/top-bar.svelte";
import { type ExtendedNote, notesStore } from "$lib/store/notes.svelte";
import { settingsStore } from "$lib/store/settings.svelte";
import { swr } from "@svelte-drama/swr";
import { clsx } from "clsx";
import { MoreVerticalIcon, ShareIcon, TrashIcon } from "lucide-svelte";
import { marked } from "marked";
import pDebounce from "p-debounce";
import { onMount } from "svelte";
import type { FocusEventHandler } from "svelte/elements";

const { name } = $page.params;
let note = $state<ExtendedNote>();
let sidebarOpened = $state(false);
const content = $derived(note ? marked.parse(note.content) : "");

function toggleSidebar() {
	sidebarOpened = !sidebarOpened;
}

const model = swr<string, ExtendedNote>({
	key: () => name,
	async fetcher(_, name) {
		return notesStore.fetchNote(name);
	},
	maxAge: 1800000,
	name: `note-${name}`,
});

async function fetchNote() {
	note = await model.get(name);
}

async function onContentUpdate(markdownContent: string) {
	await notesStore.updateNote({ filename: name, content: markdownContent });
	return model.refresh(name);
}

async function onNameUpdate(event: any) {
	const nextFilename = `${event.target.value}.md`;
	await notesStore.renameNote({ filename: name, nextFilename });
	return replaceState(`/notes/${nextFilename}`);
}

async function copyMarkdown() {
	if (!note) return;
	await navigator.clipboard.writeText(note.content);
	return toggleSidebar();
}

function handleNavigation(event: KeyboardEvent) {
	if (event.key === "Escape") {
		return event.target.blur();
	}
}

function goBack() {
	if (sidebarOpened) {
		return toggleSidebar();
	}
	return window.history.back();
}

onMount(() => {
	fetchNote();
	window.addEventListener("focus", fetchNote);
	return () => {
		window.removeEventListener("focus", fetchNote);
	};
});
</script>

<div class="drawer drawer-end">
	<input id="sidebar" type="checkbox" class="drawer-toggle" bind:checked={sidebarOpened} />
  <div class="drawer-content">
		<div class="flex flex-1 flex-col">
			<TopBar goBack={goBack}>
		    <input slot="input" class="grow h-8 font-semibold text-lg" value={note?.title ?? ""} onkeydown={handleNavigation} onchange={onNameUpdate} placeholder="Note name" />
		    <label for="sidebar" slot="addon" class="btn btn-sm btn-neutral btn-square drawer-button text-primary" data-hotkey="Mod+j">
		      <MoreVerticalIcon size={16} />
		    </label>
			</TopBar>
		  <div class="pt-20 px-8 pb-8">
		  {#if note}
		    <NoteEditor {content} onUpdate={onContentUpdate} {toggleSidebar} />
		  {/if}
			</div>
		</div>
  </div>
  <div id="sidebarContent" class="drawer-side z-20">
    <label for="sidebar" aria-label="close sidebar" class="drawer-overlay"></label>
    <ul class="menu menu-lg bg-base-200 text-base-content min-h-full w-80 p-4" data-hotkey="c">
      <li><a class="justify-between" onclick={copyMarkdown}>
      	<span>Copy Markdown</span>
      	<kbd class="kbd">c</kbd>
      </a></li>
      <li class="text-red-300"><a class="justify-between" data-hotkey="d">
      	<span>Delete Note</span>
      	<kbd class="kbd">d</kbd>
      </a></li>
    </ul>
  </div>
</div>

