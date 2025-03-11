<script lang="ts">
import { getApiClient } from "$lib/utils.svelte";
import type { Editor } from "@tiptap/core";
import { createForm } from "felte";
import { SparklesIcon } from "lucide-svelte";
import { _ } from "svelte-i18n";
import PrimaryButton from "../primary-button.svelte";

const { form } = createForm<{ prompt: string }>({
	async onSubmit(values) {
		const apiClient = getApiClient();
		const context = editor?.getText() ?? "";
		const response = await apiClient.api.ai.generate.$post({
			json: {
				prompt: values.prompt,
				context,
				contentType: "INLINE_AI",
			},
		});
		const { text } = await response.json();
		editor?.chain().focus().insertContent(text).run();
	},
});

let { editor } = $props<{ editor: Editor | undefined }>();

let promptInput = $state<HTMLInputElement>();
let menuState = $state<"idle" | "prompting" | "generating">("idle");

export function toggleState() {
	menuState = menuState === "idle" ? "prompting" : "idle";
	if (menuState === "prompting") {
		return setTimeout(() => promptInput?.focus(), 100);
	}
	return setTimeout(() => editor?.commands.focus(), 100);
}

function handlePromptKeyDown(event: KeyboardEvent) {
	if (event.key === "Escape") {
		event.preventDefault();
		toggleState();
	}
}
</script>

<form use:form class="join">
    {#if menuState === "idle"}
		<PrimaryButton class="btn-sm rounded-full text-primary" onclick={toggleState}>	
			<span>⌘I</span>
            <span>{$_("editor.floatingMenu.askAI")}</span>
        </PrimaryButton>
    {:else}
        <label class="input rounded-full !outline-none">
            <SparklesIcon size={16} />
            <input bind:this={promptInput} name="prompt" type="text" placeholder={$_("editor.floatingMenu.askAI")} onblur={toggleState} onkeydown={handlePromptKeyDown} />
        </label>
    {/if}
</form>