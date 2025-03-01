<script lang="ts">
import { SEARCH_MODE, appStore } from "$lib/store/app.svelte";
import clsx from "clsx";
import { GlobeIcon, SparklesIcon } from "lucide-svelte";

const SEARCH_MODES = [
	{ value: SEARCH_MODE.WEB, icon: GlobeIcon },
	{ value: SEARCH_MODE.AI, icon: SparklesIcon },
];
</script>

<div class="join">
    {#each SEARCH_MODES as mode}
        {@const active = mode.value === appStore.searchMode}
        <button type="button" class={clsx("btn join-item", active ? 'text-primary' : 'text-neutral-500')} onclick={() => appStore.searchMode = mode.value}>
            <mode.icon size={20} />
        </button>
    {/each}
</div>