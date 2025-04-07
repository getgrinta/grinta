<script lang="ts">
	import { appStore } from "$lib/store/app.svelte";
	import { getApiClient } from "$lib/utils.svelte";
	import type { Editor } from "@tiptap/core";
	import {
		ChevronLeftIcon,
		LanguagesIcon,
		QuoteIcon,
		SparklesIcon,
	} from "lucide-svelte";
	import { onMount } from "svelte";
	import { _ } from "svelte-i18n";
	import ContextMenu, { type MenuItem } from "../context-menu.svelte";
	import { emit } from "@tauri-apps/api/event";

	const hasPro = appStore.subscriptions.length > 0;

	const TRANSLATE_LANGUAGE = {
		ENGLISH: { code: "ENGLISH", display: "English" },
		SPANISH: { code: "SPANISH", display: "Español" },
		FRENCH: { code: "FRENCH", display: "Français" },
		GERMAN: { code: "GERMAN", display: "Deutsch" },
		CHINESE_SIMPLIFIED: { code: "CHINESE_SIMPLIFIED", display: "简体中文" },
		ITALIAN: { code: "ITALIAN", display: "Italiano" },
		PORTUGUESE: { code: "PORTUGUESE", display: "Português" },
		RUSSIAN: { code: "RUSSIAN", display: "Русский" },
		JAPANESE: { code: "JAPANESE", display: "日本語" },
		KOREAN: { code: "KOREAN", display: "한국어" },
		ARABIC: { code: "ARABIC", display: "العربية" },
		HINDI: { code: "HINDI", display: "हिन्दी" },
		TURKISH: { code: "TURKISH", display: "Türkçe" },
		DUTCH: { code: "DUTCH", display: "Nederlands" },
		POLISH: { code: "POLISH", display: "Polski" },
		SWEDISH: { code: "SWEDISH", display: "Svenska" },
		NORWEGIAN: { code: "NORWEGIAN", display: "Norsk" },
		DANISH: { code: "DANISH", display: "Dansk" },
		FINNISH: { code: "FINNISH", display: "Suomi" },
		CZECH: { code: "CZECH", display: "Čeština" },
		GREEK: { code: "GREEK", display: "Ελληνικά" },
		UKRAINIAN: { code: "UKRAINIAN", display: "Українська" },
		VIETNAMESE: { code: "VIETNAMESE", display: "Tiếng Việt" },
		THAI: { code: "THAI", display: "ไทย" },
	} as const;

	let contextMenuItems = $state<MenuItem[]>(
		Object.values(TRANSLATE_LANGUAGE).map((lang) => ({
			label: lang.display,
			onClick: () => {
				translate({
					targetLanguage: lang.code,
				});
			},
		}))
	);

	export const MENU_MODE = {
		IDLE: "IDLE",
		REPHRASE_CHOICE: "REPHRASE_CHOICE",
		TRANSLATE_CHOICE: "TRANSLATE_CHOICE",
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

	type TranslateAction = {
		targetLanguage: typeof TRANSLATE_LANGUAGE[keyof typeof TRANSLATE_LANGUAGE]["code"];
	};

	export const REPHRASE_SYSTEM_PROMPT = {
		[REPHRASE_ACTION.LONGER]:
			"Make the text longer. Keep the current language.",
		[REPHRASE_ACTION.SHORTER]:
			"Make the text shorter. Keep the current language.",
		[REPHRASE_ACTION.GRAMMAR]:
			"Correct the grammar. Keep the current language.",
		[REPHRASE_ACTION.PROFESSIONAL]:
			"Make the text more professional. Keep the current language.",
	} as const;

	export const rephraseAction = Object.keys(
		REPHRASE_ACTION,
	) as RephraseAction[];

	let { editor, onStartGenerating, onStopGenerating } = $props<{
		editor: Editor | undefined;
		onStartGenerating: () => void;
		onStopGenerating: () => void;
	}>();
	let isVisible = $state<boolean>(true);
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
		const prompt = REPHRASE_SYSTEM_PROMPT[rephraseAction];
		const selectedText = editor?.state.doc.textBetween(
			editor.state.selection.from,
			editor.state.selection.to,
			" ",
		);
		if (!selectedText) {
			return;
		}
		onStartGenerating();
		isVisible = false;
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
		onStopGenerating();
		isVisible = true;
		menuMode = MENU_MODE.IDLE;
	}

	async function translate(action: TranslateAction) {
		const apiClient = getApiClient();
		const prompt = `Translate the text to ${action.targetLanguage}. Keep the meaning as close as possible.`;
		const selectedText = editor?.state.doc.textBetween(
			editor.state.selection.from,
			editor.state.selection.to,
			" ",
		);
		if (!selectedText) {
			return;
		}
		onStartGenerating();
		isVisible = false;
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
		onStopGenerating();
		isVisible = true;
		menuMode = MENU_MODE.IDLE;
	}

	onMount(() => {
		isVisible = true;
	});
</script>

<div>
	<ContextMenu
		searchable={true}
		name="translate"
		items={contextMenuItems}
		onhide={() => (isVisible = true)}
	/>

	{#if isVisible}
		<div class="join">
			{#if menuMode === MENU_MODE.IDLE}
				<button
					type="button"
					class="btn btn-sm join-item items-center text-primary-content font-bold"
					onclick={makeSelectionBold}>B</button
				>
				<button
					type="button"
					class="btn btn-sm join-item items-center text-primary-content underline"
					onclick={makeSelectionUnderline}>U</button
				>
				<button
					type="button"
					class="btn btn-sm join-item items-center text-primary-content italic"
					onclick={makeSelectionItalic}>I</button
				>
				<button
					type="button"
					class="btn btn-sm join-item items-center text-primary-content"
					onclick={toggleQuote}
				>
					<QuoteIcon size={16} />
				</button>
				<button
					type="button"
					class="btn btn-sm join-item items-center text-primary-content"
					onclick={() => toggleHeader(1)}>H1</button
				>
				<button
					type="button"
					class="btn btn-sm join-item items-center text-primary-content"
					onclick={() => toggleHeader(2)}>H2</button
				>
				<button
					type="button"
					class="btn btn-sm join-item items-center text-primary-content"
					onclick={() => toggleHeader(3)}>H3</button
				>
				{#if hasPro}
					<button
						type="button"
						class="btn btn-sm join-item items-center text-primary-content"
						onclick={() => setMenuMode(MENU_MODE.REPHRASE_CHOICE)}
					>
						<SparklesIcon size={16} />
						<span>{$_("notes.rephrase")}</span>
					</button>
					<button
						type="button"
						class="btn btn-sm join-item items-center text-primary-content"
						onclick={(event) => {
							setMenuMode(MENU_MODE.IDLE);
							isVisible = false;

							emit("show-context-menu", {
								x: 100,
								y: 100,
								name: "translate",
							});
						}}
					>
						<LanguagesIcon size={16} />
						<span>{$_("notes.translate")}</span>
					</button>
				{/if}
			{:else if menuMode === MENU_MODE.REPHRASE_CHOICE || menuMode == MENU_MODE.REPHRASING}
				<button
					type="button"
					class="btn btn-sm join-item items-center text-primary-content"
					onclick={() => setMenuMode(MENU_MODE.IDLE)}
				>
					<ChevronLeftIcon size={16} />
				</button>
				{#each rephraseAction as action}
					<button
						type="button"
						class="btn btn-sm join-item items-center text-primary-content"
						onclick={() => rephrase(action)}
					>
						{$_("notes." + action.toLowerCase())}
					</button>
				{/each}
			{:else if menuMode === MENU_MODE.TRANSLATE_CHOICE}
				<button
					type="button"
					class="btn btn-sm join-item items-center text-primary-content"
					onclick={() => setMenuMode(MENU_MODE.IDLE)}
				>
					<ChevronLeftIcon size={16} />
				</button>
			{/if}
		</div>
	{/if}
</div>
