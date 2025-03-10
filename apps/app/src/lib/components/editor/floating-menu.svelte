<script lang="ts">
import type { Editor } from "@tiptap/core";
import { SparklesIcon } from "lucide-svelte";
import { _ } from "svelte-i18n";
    import SecondaryButton from "../secondary-button.svelte";

let { editor } = $props<{ editor: Editor | undefined }>();

let prompt = $state("");
let promptInput = $state<HTMLInputElement>();
let menuState = $state<"idle" | "prompting">("idle");

function toggleState() {
	menuState = menuState === "idle" ? "prompting" : "idle";
	if (menuState === "prompting") {
		return setTimeout(() => promptInput?.focus(), 100);
	}
	return setTimeout(() => editor?.focus(), 100);
}

function setPrompt(newPrompt: string) {
	prompt = newPrompt;
}

function handlePromptKeyDown(event: KeyboardEvent) {
	if (event.key === "Escape") {
		event.preventDefault();
		toggleState();
	}
	if (event.key === "Enter") {
		event.preventDefault();
		console.log(">>>INLINE_AI", prompt);
		setPrompt("");
		toggleState();
	}
}
</script>

<div class="join">
    {#if menuState === "idle"}
        <SecondaryButton class="btn-sm rounded-full text-primary" onclick={toggleState}>
            <SparklesIcon size={16} />
            <span>{$_("editor.floatingMenu.askAI")}</span>
        </SecondaryButton>
    {:else}
        <label class="input rounded-full !outline-none">
            <SparklesIcon size={16} />
            <input bind:this={promptInput} bind:value={prompt} type="text" placeholder={$_("editor.floatingMenu.askAI")} onblur={toggleState} onkeydown={handlePromptKeyDown} />
        </label>
    {/if}
</div>