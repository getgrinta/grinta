<script lang="ts">
	import { goto } from "$app/navigation";
	import { TextSuggestion } from "$lib/editor/suggestion";
	import { aiStore } from "$lib/store/ai.svelte";
	import { BAR_MODE, appStore } from "$lib/store/app.svelte";
	import { settingsStore } from "$lib/store/settings.svelte";
	import { LogicalSize } from "@tauri-apps/api/dpi";
	import { currentMonitor } from "@tauri-apps/api/window";
	import { Editor, Extension } from "@tiptap/core";
	import BubbleMenuExtension from "@tiptap/extension-bubble-menu";
	import FloatingMenuExtension from "@tiptap/extension-floating-menu";
	import UnderlineExtension from "@tiptap/extension-underline";
	import StarterKit from "@tiptap/starter-kit";
	import { marked } from "marked";
	import { onDestroy } from "svelte";
	import TurndownService from "turndown";
	import BubbleMenu from "./editor/bubble-menu.svelte";
	import FloatingMenu from "./editor/floating-menu.svelte";

	const hasPro = appStore.subscriptions.length > 0;

	const turndownService = new TurndownService({ headingStyle: "atx" });

	// Markdown to HTML conversion helper
	async function markdownToHtml(markdown: string): Promise<string> {
		try {
			const result = await marked.parse(markdown);
			return result.toString();
		} catch (error) {
			console.error("Error converting markdown to HTML:", error);
			return markdown; // Fallback to raw content
		}
	}

	const { content, onUpdate, editable = true, toggleSidebar } = $props();

	let element = $state<HTMLElement>();
	let floatingMenuTooltip = $state<HTMLElement>();
	let bubbleMenuTooltip = $state<HTMLElement>();
	let floatingMenu = $state<FloatingMenu>();
	let editor = $state<Editor>();

	// Track if initialization is in progress to prevent duplicate initialization
	let isInitializing = $state(false);

	async function setContentAwareWindowHeight() {
		const monitor = await currentMonitor();
		const maxHeight = monitor ? monitor?.size.height / 3 : 800;
		const size = element?.getBoundingClientRect();
		const nextHeightCalc = 160 + (size?.height ?? 28);
		const nextHeight =
			nextHeightCalc > maxHeight ? maxHeight : nextHeightCalc;
		return appStore.appWindow?.setSize(
			new LogicalSize(800, Math.max(nextHeight, 400)),
		);
	}

	function resetWindowHeight() {
		return appStore.appWindow?.setSize(new LogicalSize(800, 400));
	}

	function buildEditor(initialContent: string) {
		// Create the custom extension
		const ChangeDefaultExtension = Extension.create({
			name: "ChangeDefault",
			addKeyboardShortcuts() {
				return {
					Escape() {
						return editor?.view.dom.blur();
					},
					"Mod-k"() {
						return goto(`/commands/${BAR_MODE.MENU}`);
					},
					"Mod-i"() {
						// Safely access editor
						const currentEditor = editor;
						if (!currentEditor) return false;

						const from = currentEditor.state.selection.$from;
						const blockStart = from?.start();
						const blockEnd = from?.end();
						const blockContent =
							blockStart && from
								? (currentEditor.state.doc.textBetween(
										blockStart,
										from?.pos,
										" ",
									) ?? "")
								: "";
						if (blockEnd && blockContent.length > 0) {
							currentEditor
								.chain()
								.insertContentAt(blockEnd, {
									type: "paragraph",
								})
								.focus()
								.run();
						}
						return floatingMenu?.toggleState();
					},
					async "Mod-j"() {
						editor?.commands.blur();
						return toggleSidebar();
					},
				} as never;
			},
		});

		const extensions = [
			StarterKit,
			ChangeDefaultExtension,
			UnderlineExtension,
			FloatingMenuExtension.configure({
				element: floatingMenuTooltip,
				tippyOptions: {
					animation: "fade",
					duration: 100,
				},
			}),
			BubbleMenuExtension.configure({
				element: bubbleMenuTooltip,
				tippyOptions: {
					animation: "fade",
					duration: 100,
				},
			}),
		];

		if (hasPro && settingsStore.data.proAutocompleteEnabled) {
			extensions.push(
				TextSuggestion.configure({
					async fetchAutocompletion({
						query,
					}: Record<string, string>) {
						// Safely access editor without self-referencing
						const currentEditor = editor;
						const context = currentEditor?.getText() ?? "";
						const result = await aiStore.generateText({
							prompt: query,
							context,
							contentType: "AUTOCOMPLETION",
						});
						const { text } = await result.json();
						return text;
					},
				}),
			);
		}

		// Create a new editor instance without any self-referencing
		const newEditor = new Editor({
			element: element,
			editable: editable,
			extensions,
			content: initialContent,
			onTransaction() {
				// Force re-render so editor.isActive works as expected
				// but avoid self-referencing in the callback
				if (editor) {
					// eslint-disable-next-line no-self-assign
					editor = editor;
				}
				setContentAwareWindowHeight();
			},
			onCreate() {
				setContentAwareWindowHeight();
			},
			onUpdate({ editor: updatedEditor }) {
				const newContent = updatedEditor.getHTML();
				const markdownContent = turndownService.turndown(newContent);
				updatedEditor.commands.scrollIntoView();
				setContentAwareWindowHeight();
				return onUpdate(markdownContent);
			},
			onDestroy() {
				return resetWindowHeight();
			},
			autofocus: true,
		});

		return newEditor;
	}

	async function initializeEditor() {
		// Guard against multiple simultaneous initialization attempts
		if (
			isInitializing ||
			!element ||
			!floatingMenuTooltip ||
			!bubbleMenuTooltip ||
			editor
		)
			return;

		isInitializing = true;

		try {
			// Convert markdown to HTML first
			const htmlContent = await markdownToHtml(content);

			// Initialize the editor with the HTML content
			editor = buildEditor(htmlContent);
		} catch (error) {
			console.error("Error initializing editor with markdown:", error);
			// Fallback to initializing with raw content
			editor = buildEditor(content);
		} finally {
			isInitializing = false;
		}
	}

	// Use only one initialization method - the effect
	// Remove the onMount call to prevent duplicate initialization
	onDestroy(() => {
		if (editor) {
			editor.destroy();
		}
	});

	$effect(() => {
		// Initialize editor when elements are ready and editor doesn't exist
		if (
			element &&
			floatingMenuTooltip &&
			bubbleMenuTooltip &&
			!editor &&
			!isInitializing
		) {
			initializeEditor();
		}
	});

	$effect(() => {
		if (!editor) return;

		// Skip this effect if editor isn't fully initialized or is initializing
		if (!editor.isEditable || isInitializing) return;

		// IMPORTANT: Don't re-set content on small changes - this resets cursor
		// Compare actual editor content with new content
		// Convert current HTML to markdown for proper comparison
		const currentHTML = editor.getHTML();
		const currentMarkdown = turndownService.turndown(currentHTML);

		// Only update if the markdown content is completely different (loading new document)
		// NOT on regular typing/editing which causes cursor jumps
		if (
			content !== currentMarkdown &&
			// Only update for substantial differences or when editor content is empty

			// Handle when editor is initialized with empty content
			(currentMarkdown === "" ||
				// This will be true when a document is first loaded or replaced
				Math.abs(content.length - currentMarkdown.length) > 50)
		) {
			// Save selection
			const savedSelection = editor.isEditable
				? editor.state.selection
				: null;

			// Save cursor position
			const { from, to } = editor.state.selection;

			// Signal this is an external update to prevent suggestion reset
			editor.view.dispatch(
				editor.state.tr.setMeta("preventSuggestionReset", true),
			);

			// Convert markdown to HTML before setting content (only once, not twice)
			let isUpdating = true;
			(async () => {
				try {
					// Convert markdown to HTML
					const htmlContent = await markdownToHtml(content);

					// Skip if editor was destroyed during async operation
					if (!editor) return;

					// Update content with the HTML
					editor.commands.setContent(htmlContent);

					// Restore selection if needed
					if (savedSelection && editor.isEditable) {
						try {
							// Try to restore exact selection
							editor.commands.setTextSelection(savedSelection);
						} catch {
							try {
								// Fall back to preserving cursor position if possible
								editor.commands.setTextSelection({ from, to });
							} catch {
								// Last resort: focus at end
								editor.commands.focus("end");
							}
						}
					}
				} catch (error) {
					console.error("Error updating editor content:", error);
					// Fallback to setting raw content only if editor still exists
					if (editor) {
						editor.commands.setContent(content);
					}
				} finally {
					isUpdating = false;
				}
			})();
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

<div bind:this={floatingMenuTooltip}>
	<FloatingMenu bind:this={floatingMenu} {editor} />
</div>
<div bind:this={bubbleMenuTooltip}>
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
