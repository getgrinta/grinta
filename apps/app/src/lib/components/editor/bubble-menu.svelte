<script lang="ts">
import type { Editor } from "@tiptap/core";
import { QuoteIcon, SparklesIcon } from "lucide-svelte";

let { editor } = $props<{ editor: Editor | undefined }>();
</script>

<div class="join">
	<button type="button" class="btn btn-sm join-item items-center text-primary font-bold">B</button>
	<button type="button" class="btn btn-sm join-item items-center text-primary underline">U</button>
	<button type="button" class="btn btn-sm join-item items-center text-primary italic">I</button>
	<button type="button" class="btn btn-sm join-item items-center text-primary">
		<QuoteIcon size={16} />
	</button>
	<button type="button" class="btn btn-sm join-item items-center text-primary">H1</button>
	<button type="button" class="btn btn-sm join-item items-center text-primary">H2</button>
	<button type="button" class="btn btn-sm join-item items-center text-primary">H3</button>
	<button type="button" class="btn btn-sm join-item items-center text-primary">
		<SparklesIcon size={16} />
		<span>Rephrase</span>
	</button>
</div>