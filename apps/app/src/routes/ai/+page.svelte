<script lang="ts">
import TopBar from "$lib/components/top-bar.svelte";
import { _ } from "svelte-i18n";
import { aiStore } from "$lib/store/ai.svelte";
import { appStore } from "$lib/store/app.svelte";
import SegmentedControl from "$lib/components/segmented-control.svelte";
import { toast } from "svelte-sonner";
import { CopyIcon, StickyNoteIcon } from "lucide-svelte";
  import { notesStore } from "$lib/store/notes.svelte";
  import { goto } from "$app/navigation";

async function copyResult() {
    await navigator.clipboard.writeText(aiStore.grintAiResult ?? "")
    return toast.success($_("ai.copySuccess"))
}

async function createNote() {
	const filename = await notesStore.createNote(
		appStore.query,
		aiStore.grintAiResult ?? "",
	);
    const encodedFilename = encodeURIComponent(filename);
    return goto(`/notes/${encodedFilename}`, { replaceState: true });
}

const viewControls = [
    { text: $_("ai.copy"), onClick: copyResult, icon: CopyIcon, shortcut: "⌘⇧C", hotkey: "Mod+Shift+C" },
    { text: $_("ai.createNote"), onClick: createNote, icon: StickyNoteIcon, shortcut: "⌘N", hotkey: "Mod+N" }
];

let loading = $state<boolean>(true);

$effect(() => {
    if (appStore.query.length === 0) return
    loading = true
    aiStore.fetchGrintAiResult(appStore.query).then(() => {
        loading = false
    })
})
</script>

<div class="flex flex-1 flex-col gap-4 p-4">
	<TopBar>
		<div
			slot="input"
			class="grow flex-1 truncate text-lg font-semibold"
		>
			{appStore.query}
		</div>
        <div slot="addon">
            <SegmentedControl items={viewControls} />
		</div>
	</TopBar>
    <div class="mt-16">
        {#if loading}
            <div class="skeleton w-full h-24"></div>
        {:else}
            <div class="prose mx-auto text-justify">
                {aiStore.grintAiResult}
            </div>
        {/if}
    </div>
</div>
