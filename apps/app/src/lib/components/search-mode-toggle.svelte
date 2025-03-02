<script lang="ts">
import { SEARCH_MODE, appStore } from "$lib/store/app.svelte";
import { GlobeIcon, SparklesIcon } from "lucide-svelte";

const _SEARCH_MODES = [
	{ value: SEARCH_MODE.WEB, icon: GlobeIcon },
	{ value: SEARCH_MODE.AI, icon: SparklesIcon },
];

function toggleMode() {
	return appStore.toggleSearchMode();
}
</script>

<button type="button" class="hidden" data-hotkey="Mod+j" onclick={toggleMode}>Toggle Search Mode</button>

<div class="join">
    {#each SEARCH_MODES as mode}
        {@const active = mode.value === appStore.searchMode}
        <button type="button" class={clsx("btn btn-sm join-item", active ? 'text-primary' : 'text-neutral-500')} onclick={() => appStore.searchMode = mode.value}>
            <mode.icon size={16} />
        </button>
    {/each}
</div>
