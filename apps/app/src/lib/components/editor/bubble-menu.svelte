<script lang="ts">
import type { Editor } from "@tiptap/core";
import { QuoteIcon, SparklesIcon } from "lucide-svelte";
import { fly } from "svelte/transition";

let { editor } = $props<{ editor: Editor | undefined }>();

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
</script>

<div class="join">
	<button type="button" class="btn btn-sm join-item items-center text-primary font-bold" onclick={makeSelectionBold}>B</button>
	<button type="button" class="btn btn-sm join-item items-center text-primary underline" onclick={makeSelectionUnderline}>U</button>
	<button type="button" class="btn btn-sm join-item items-center text-primary italic" onclick={makeSelectionItalic}>I</button>
	<button type="button" class="btn btn-sm join-item items-center text-primary" onclick={toggleQuote}>
		<QuoteIcon size={16} />
	</button>
	<button type="button" class="btn btn-sm join-item items-center text-primary" onclick={() => toggleHeader(1)}>H1</button>
	<button type="button" class="btn btn-sm join-item items-center text-primary" onclick={() => toggleHeader(2)}>H2</button>
	<button type="button" class="btn btn-sm join-item items-center text-primary" onclick={() => toggleHeader(3)}>H3</button>
	<button type="button" class="btn btn-sm join-item items-center text-primary">
		<SparklesIcon size={16} />
		<span>Rephrase</span>
	</button>
</div>