<script lang="ts">
import { goto } from "$app/navigation";
import { TextSuggestion } from "$lib/editor/suggestion";
import { aiStore } from "$lib/store/ai.svelte";
import { BAR_MODE, appStore } from "$lib/store/app.svelte";
import { LogicalSize } from "@tauri-apps/api/dpi";
import { currentMonitor } from "@tauri-apps/api/window";
import { Editor, Extension } from "@tiptap/core";
import BlockquoteExtension from "@tiptap/extension-blockquote";
import BubbleMenuExtension from "@tiptap/extension-bubble-menu";
import FloatingMenuExtension from "@tiptap/extension-floating-menu";
import HeadingExtension from "@tiptap/extension-heading";
import UnderlineExtension from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";
import { onDestroy, onMount } from "svelte";
import TurndownService from "turndown";
import BubbleMenu from "./editor/bubble-menu.svelte";
import FloatingMenu from "./editor/floating-menu.svelte";

const turndownService = new TurndownService({ headingStyle: "atx" });

const { content, onUpdate, editable = true, toggleSidebar } = $props();

let element = $state<HTMLElement>();
let floatingMenu = $state<HTMLElement>();
let bubbleMenu = $state<HTMLElement>();
let editor = $state<Editor>();

async function setContentAwareWindowHeight() {
	const monitor = await currentMonitor();
	const maxHeight = monitor ? monitor?.size.height / 3 : 800;
	const size = element?.getBoundingClientRect();
	const nextHeightCalc = 160 + (size?.height ?? 28);
	const nextHeight = nextHeightCalc > maxHeight ? maxHeight : nextHeightCalc;
	return appStore.appWindow?.setSize(
		new LogicalSize(800, Math.max(nextHeight, 400)),
	);
}

function resetWindowHeight() {
	return appStore.appWindow?.setSize(new LogicalSize(800, 400));
}

function buildEditor() {
	const ChangeDefaultExtension = Extension.create({
		name: "ChangeDefault",
		addKeyboardShortcuts() {
			return {
				"Mod-k"() {
					return goto(`/commands/${BAR_MODE.MENU}`);
				},
				async "Mod-j"() {
					editor?.commands.blur();
					return toggleSidebar();
				},
			} as never;
		},
	});
	return new Editor({
		element: element,
		editable: editable,
		extensions: [
			StarterKit,
			ChangeDefaultExtension,
			UnderlineExtension,
			BlockquoteExtension,
			HeadingExtension,
			FloatingMenuExtension.configure({
				element: floatingMenu,
				tippyOptions: {
					animation: "fade",
					duration: 100,
				},
			}),
			BubbleMenuExtension.configure({
				element: bubbleMenu,
				tippyOptions: {
					animation: "fade",
					duration: 100,
				},
			}),
			TextSuggestion.configure({
				async fetchAutocompletion({ query }: Record<string, string>) {
					const context = editor?.getText() ?? "";
					const result = await aiStore.generateText({
						prompt: query,
						context,
						contentType: "AUTOCOMPLETION",
					});
					const { text } = await result.json();
					return text;
				},
			}),
		],
		content,
		onTransaction() {
			// force re-render so `editor.isActive` works as expected
			// biome-ignore lint/correctness/noSelfAssign: <explanation>
			editor = editor;
			setContentAwareWindowHeight();
		},
		onCreate() {
			setContentAwareWindowHeight();
		},
		onUpdate({ editor }) {
			const newContent = editor.getHTML();
			const markdownContent = turndownService.turndown(newContent);
			editor.commands.scrollIntoView();
			setContentAwareWindowHeight();
			return onUpdate(markdownContent);
		},
		onDestroy() {
			return resetWindowHeight();
		},
		autofocus: true,
	});
}

function initializeEditor() {
	if (!element || !floatingMenu || !bubbleMenu) return;
	editor = buildEditor();
}

onMount(initializeEditor);

onDestroy(() => {
	if (editor) {
		editor.destroy();
	}
});

$effect(() => {
	// Re-initialize editor if any of the required elements change
	if (element && floatingMenu && bubbleMenu && !editor) {
		initializeEditor();
	}
});

$effect(() => {
	if (!editor) return;

	// Check if content has changed significantly before updating
	const currentHTML = editor.getHTML();
	if (
		currentHTML !== content &&
		// Only update if the difference is significant or content is empty
		(content === "" || Math.abs(currentHTML.length - content.length) > 1)
	) {
		// Save selection
		let savedSelection = null;
		if (editor.isEditable) {
			savedSelection = editor.state.selection;
		}

		// Update content
		editor.commands.setContent(content);

		// Restore selection if needed
		if (savedSelection && editor.isEditable) {
			try {
				editor.commands.setTextSelection(savedSelection);
			} catch (e) {
				// Fallback if selection can't be restored
				editor.commands.focus("end");
			}
		}
	}

	// Handle editable state changes
	const currentIsEditable = editor.isEditable;
	if (editable !== currentIsEditable) {
		editor.setEditable(editable);
		if (editable) {
			editor.commands.focus();
		}
	}
});
</script>

<div bind:this={floatingMenu}>
	<FloatingMenu {editor} />
</div>
<div bind:this={bubbleMenu}>
	<BubbleMenu {editor} />
</div>
<div class="prose" bind:this={element}></div>

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
