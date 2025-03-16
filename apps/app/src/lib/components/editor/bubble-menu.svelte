<script lang="ts">
	import { getApiClient } from "$lib/utils.svelte";
	import type { Editor } from "@tiptap/core";
	import { ChevronLeftIcon, QuoteIcon, SparklesIcon } from "lucide-svelte";
	import { _ } from "svelte-i18n";

	export const MENU_MODE = {
		IDLE: "IDLE",
		REPHRASE_CHOICE: "REPHRASE_CHOICE",
		REPHRASING: "REPHRASING",
	} as const;

	type MenuMode = keyof typeof MENU_MODE;

	export const REPHRASE_ACTION = {
		LONGER: "LONGER",
		SHORTER: "SHORTER",
		GRAMMAR: "GRAMMAR",
		PROFESSIONAL: "PROFESSIONAL",
	} as const;

	type RephraseAction = keyof typeof REPHRASE_ACTION;

	export const REPHRASE_PROMPT = {
		[REPHRASE_ACTION.LONGER]: "Make the text longer",
		[REPHRASE_ACTION.SHORTER]: "Make the text shorter",
		[REPHRASE_ACTION.GRAMMAR]: "Correct the grammar",
		[REPHRASE_ACTION.PROFESSIONAL]: "Make the text more professional",
	} as const;

	export const rephraseAction = Object.keys(
		REPHRASE_ACTION,
	) as RephraseAction[];

	let { editor } = $props<{ editor: Editor | undefined }>();
	let menuMode = $state<MenuMode>(MENU_MODE.IDLE);

	function makeSelectionBold() {
		return editor?.chain().focus().toggleBold().run();
	}

	function makeSelectionItalic() {
		return editor?.chain().focus().toggleItalic().run();
	}

	function makeSelectionUnderline() {
		return editor?.chain().focus().toggleUnderline().run();
	}

	function toggleHeader(level: number) {
		return editor?.chain().focus().toggleHeading({ level }).run();
	}

	function toggleQuote() {
		return editor?.chain().focus().toggleBlockquote().run();
	}

	function setMenuMode(mode: MenuMode) {
		menuMode = mode;
	}

	async function rephrase(rephraseAction: RephraseAction) {
		const apiClient = getApiClient();
		const prompt = REPHRASE_PROMPT[rephraseAction];
		const selectedText = editor?.state.doc.textBetween(
			editor.state.selection.from,
			editor.state.selection.to,
			" ",
		);
		if (!selectedText) {
			return;
		}
		const response = await apiClient.api.ai.generate.$post({
			json: {
				prompt: selectedText,
				context: prompt,
				contentType: "REPHRASE",
			},
		});
		const { text } = await response.json();
		editor?.chain().focus().deleteRange(editor.state.selection).run();
		editor?.chain().focus().insertContent(text).run();
	}
</script>

<div class="join">
	{#if menuMode === MENU_MODE.IDLE}
		<button
			type="button"
			class="btn btn-sm join-item items-center text-primary font-bold"
			onclick={makeSelectionBold}>B</button
		>
		<button
			type="button"
			class="btn btn-sm join-item items-center text-primary underline"
			onclick={makeSelectionUnderline}>U</button
		>
		<button
			type="button"
			class="btn btn-sm join-item items-center text-primary italic"
			onclick={makeSelectionItalic}>I</button
		>
		<button
			type="button"
			class="btn btn-sm join-item items-center text-primary"
			onclick={toggleQuote}
		>
			<QuoteIcon size={16} />
		</button>
		<button
			type="button"
			class="btn btn-sm join-item items-center text-primary"
			onclick={() => toggleHeader(1)}>H1</button
		>
		<button
			type="button"
			class="btn btn-sm join-item items-center text-primary"
			onclick={() => toggleHeader(2)}>H2</button
		>
		<button
			type="button"
			class="btn btn-sm join-item items-center text-primary"
			onclick={() => toggleHeader(3)}>H3</button
		>
		<button
			type="button"
			class="btn btn-sm join-item items-center text-primary"
			onclick={() => setMenuMode(MENU_MODE.REPHRASE_CHOICE)}
		>
			<SparklesIcon size={16} />
			<span>{$_("notes.rephrase")}</span>
		</button>
	{:else}
		<button
			type="button"
			class="btn btn-sm join-item items-center text-primary"
			onclick={() => setMenuMode(MENU_MODE.IDLE)}
		>
			<ChevronLeftIcon size={16} />
		</button>
		{#each rephraseAction as action}
			<button
				type="button"
				class="btn btn-sm join-item items-center text-primary"
				onclick={() => rephrase(action)}
			>
				{$_("notes." + action.toLowerCase())}
			</button>
		{/each}
	{/if}
</div>
