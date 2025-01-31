<script lang="ts">
import { goto } from "$app/navigation";
import { TextSuggestion } from "$lib/editor/suggestion";
import { BAR_MODE } from "$lib/store/app.svelte";
import { Editor, Extension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import * as focusTrap from "focus-trap";
import { onDestroy, onMount } from "svelte";
import TurndownService from "turndown";

const turndownService = new TurndownService({ headingStyle: "atx" });

const { content, onUpdate, toggleSidebar } = $props();

let element: Element;
let editor: Editor;

function buildEditor() {
	const ChangeDefaultExtension = Extension.create({
		name: "ChangeDefault",
		addKeyboardShortcuts() {
			return {
				"Mod-k"() {
					return goto(`/commands/${BAR_MODE.MENU}`);
				},
				async "Mod-j"() {
					await editor.commands.blur();
					return toggleSidebar();
				},
			} as never;
		},
	});
	return new Editor({
		element: element,
		extensions: [
			StarterKit,
			ChangeDefaultExtension,
			TextSuggestion.configure({
				// You can override fetchAutocompletion() here if needed.
				fetchAutocompletion: async (query) => {
					console.log(">>>Q", query);
					// For demonstration, simply echo a fixed suggestion.
					// Replace this with your API call.
					return new Promise((resolve) => {
						setTimeout(() => {
							resolve("(auto-completed)");
						}, 100);
					});
				},
			}),
		],
		content,
		onTransaction() {
			// force re-render so `editor.isActive` works as expected
			editor = editor;
		},
		onUpdate({ editor }) {
			const newContent = editor.getHTML();
			const markdownContent = turndownService.turndown(newContent);
			editor.commands.scrollIntoView();
			return onUpdate(markdownContent);
		},
		autofocus: true,
	});
}

function initializeEditor() {
	editor = buildEditor();
}

onMount(initializeEditor);

onDestroy(() => {
	if (editor) {
		editor.destroy();
	}
});

$effect(() => {
	if (!editor) return;
	editor.commands.setContent(content);
});
</script>

<div class="prose" bind:this={element} />

<style>
  :global {
    .tiptap {
      outline: none;
      scroll-margin-top: 2rem;
    }
    .tiptap * {
      margin-top: 0.5rem;
      margin-bottom: 0.5rem;
    }
    .inline-suggestion {
      color: grey;
      font-style: italic;
    }
  }
</style>
