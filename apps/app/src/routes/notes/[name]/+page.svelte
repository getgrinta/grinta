<script lang="ts">
import { goto } from "$app/navigation";
import { page } from "$app/state";
import NoteEditor from "$lib/components/editor.svelte";
import TopBar from "$lib/components/top-bar.svelte";
import { BAR_MODE } from "$lib/store/app.svelte";
import { type ExtendedNote, notesStore } from "$lib/store/notes.svelte";
import { BaseDirectory, type UnwatchFn, watch } from "@tauri-apps/plugin-fs";
import clsx from "clsx";
import { MoreVerticalIcon } from "lucide-svelte";
import { PressedKeys } from "runed";
import { onMount } from "svelte";
import { _ } from "svelte-i18n";
import { toast } from "svelte-sonner";

const pressedKeys = new PressedKeys();
const isCmdPressed = pressedKeys.has("Meta");

// Initialize state

const filename = $derived(decodeURIComponent(page.params.name));
let deleteConfirmationMode = $state(false);
let note = $state<ExtendedNote>();
let noteTitle = $state<string>();
let generatingNote = $state<boolean>(false);
let unsubWatcher = $state<UnwatchFn>();
let sidebarOpened = $state(false);
let generatingContent = $state<boolean>(false);
let editorContent = $state<string>(""); // Track editor's raw markdown content

function toggleSidebar() {
	sidebarOpened = !sidebarOpened;
	deleteConfirmationMode = false;
}

function onStartGenerating() {
	generatingContent = true;
}

function onStopGenerating() {
	generatingContent = false;
}

async function fetchNote() {
	const updatedNote = await notesStore.fetchNote(filename);

	// Only update if the content has actually changed
	// This prevents cursor reset and unnecessary rerenders
	if (!note || note.content !== updatedNote.content) {
		// Store editor content before updating note
		const currentEditorContent = note?.content || "";

		// Update the note
		note = updatedNote;
		noteTitle = updatedNote?.title ?? "";

		// If editor content wasn't modified by the user (matches what was previously loaded)
		// then we can safely update it with the markdown content
		if (
			editorContent === currentEditorContent ||
			editorContent === "" ||
			currentEditorContent === ""
		) {
			// Set raw markdown content - TipTap will parse it internally
			editorContent = updatedNote.content || "";
		} else {
			console.debug("Note content changed externally while user was editing");
		}
	} else {
		// Just update title if needed but keep content as is
		if (note.title !== updatedNote.title) {
			noteTitle = updatedNote.title ?? "";
		}
	}
}

async function onContentUpdate(markdownContent: string) {
	// Update our tracked editor content - this is raw markdown
	editorContent = markdownContent;
	// Save to the store (still as markdown)
	await notesStore.updateNote({ filename, content: markdownContent });
}

async function onNameUpdate() {
	try {
		unsubWatcher?.();
		const nextFilename = `${noteTitle}.md`;
		// Wait for the rename operation to complete
		await notesStore.renameNote({ filename, nextFilename });
		// Navigate to the new URL
		await goto(`/notes/${encodeURIComponent(nextFilename)}`, {
			replaceState: true,
		});
		return setupNoteWatcher();
	} catch (error) {
		console.error("Failed to rename note:", error);
		toast.error($_("notes.failedToRename"));
	}
}

async function copyMarkdown() {
	if (!note) return;
	await navigator.clipboard.writeText(note.content);
	toast.success($_("notes.markdownCopied"));
	return toggleSidebar();
}

function handleNavigation(event: KeyboardEvent) {
	if (event.key === "Escape") {
		return (event.target as HTMLElement)?.blur();
	}
}

function goBack() {
	if (sidebarOpened) {
		return toggleSidebar();
	}
	return window.history.back();
}

async function deleteNote() {
	if (!deleteConfirmationMode) {
		deleteConfirmationMode = true;
		return;
	}
	await notesStore.deleteNote(filename);
	toast.success($_("notes.noteDeleted"));
	return goto(`/commands/${BAR_MODE.NOTES}`);
}

async function setupNoteWatcher() {
	await fetchNote();
	const fullPath = await notesStore.getFullNotePath(filename);
	unsubWatcher = await watch(fullPath, fetchNote, {
		baseDir: BaseDirectory.Home,
	});
}

onMount(() => {
	setupNoteWatcher();
	return () => {
		unsubWatcher?.();
	};
});
</script>

<div class="drawer drawer-end">
	<input
		id="sidebar"
		type="checkbox"
		class="drawer-toggle"
		bind:checked={sidebarOpened}
	/>
	<div class="drawer-content">
		<div class="flex flex-1 flex-col">
			<TopBar {goBack}>
				<input
					bind:value={noteTitle}
					slot="input"
					class="grow h-8 font-semibold text-lg"
					onkeydown={handleNavigation}
					onchange={onNameUpdate}
					placeholder={$_("notes.noteName")}
				/>
				<label class="btn btn-sm"
					for="sidebar"
					slot="addon"
					data-hotkey="Mod+j"
				>
					<MoreVerticalIcon size={16} />
					{#if isCmdPressed}
						<span>⌘J</span>
					{/if}
				</label>
			</TopBar>
			<div class="mt-20 px-8 pb-8">
				{#if note}
					<NoteEditor
						content={editorContent}
						editable={!generatingNote}
						onUpdate={onContentUpdate}
						{toggleSidebar}
						{onStartGenerating}
						{onStopGenerating}
					/>
				{/if}
			</div>
			{#if generatingContent}
				<div class="fixed bottom-4 right-4">
					<span class="loading loading-spinner loading-md text-primary-content"></span>
				</div>
			{/if}
		</div>
	</div>
	<div id="sidebarContent" class="drawer-side z-20">
		<label
			for="sidebar"
			aria-label={$_("notes.closeSidebar")}
			class="drawer-overlay"
		></label>
		<ul
			class="menu menu-lg bg-base-200 text-base-content min-h-full w-80 p-4"
		>
			<li>
				<button
					type="button"
					class="justify-between"
					onclick={copyMarkdown}
					data-hotkey="c"
				>
					<span>{$_("notes.copyMarkdown")}</span>
					<kbd class="kbd">c</kbd>
				</button>
			</li>
			<li class="text-red-300">
				<button
					type="button"
					class={clsx(
						"justify-between",
						deleteConfirmationMode && "btn btn-soft btn-error",
					)}
					onclick={deleteNote}
					data-hotkey="d"
				>
					<span
						>{deleteConfirmationMode
							? $_("notes.confirmDelete")
							: $_("notes.deleteNote")}</span
					>
					<kbd class="kbd">d</kbd>
				</button>
			</li>
		</ul>
	</div>
</div>
