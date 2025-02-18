<script lang="ts">
import type { Editor } from "@tiptap/core";

const { editor, range, query, clientRect, command } = $props<{
	editor: Editor;
	range: Range;
	query: string;
	clientRect: DOMRect | null;
	command: (params: { editor: Editor; range: Range; prompt: string }) => void;
}>();

// two modes: dropdown shows the option; prompt shows an input field
let mode = $state<"dropdown" | "prompt">("dropdown");
let promptText = $state("");

/**
 * Select the "Ask AI" option
 */
function selectAskAI(): void {
	mode = "prompt";
}

/**
 * Handle key presses for the prompt field
 * @param event - The key press event
 */
function handleKeyDown(event: KeyboardEvent): void {
	if (event.key === "Enter" && mode === "prompt") {
		// Call the provided command (for now, it logs and inserts content)
		command({ editor, range, prompt: promptText });
		console.log("Submitted prompt:", promptText);
		mode = "dropdown"; // Reset to dropdown mode instead of empty string
	}
}
</script>

{#if mode === "dropdown"}
  <ul class="dropdown dropdown-open menu" popover id="slashMenu" style="position-anchor: --anchor-1">
    <li>
      <a onclick={selectAskAI}>Ask AI</a>
    </li>
  </ul>
{:else if mode === "prompt"}
  <input
    type="text"
    class="input input-bordered w-full"
    bind:value={promptText}
    placeholder="Enter prompt..."
    onkeydown={handleKeyDown}
    autofocus />
{/if}