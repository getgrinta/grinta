<script lang="ts">
import SegmentedControl from "$lib/components/segmented-control.svelte";
import { SEARCH_MODE, appStore } from "$lib/store/app.svelte";
import { GlobeIcon, SparklesIcon } from "lucide-svelte";

const items = $derived([
	{
		icon: GlobeIcon,
		text: SEARCH_MODE.WEB,
		onClick: () => {
			appStore.searchMode = SEARCH_MODE.WEB;
		},
		active: appStore.searchMode === SEARCH_MODE.WEB,
	},
	{
		icon: SparklesIcon,
		text: SEARCH_MODE.AI,
		onClick: () => {
			appStore.searchMode = SEARCH_MODE.AI;
		},
		active: appStore.searchMode === SEARCH_MODE.AI,
	},
]);

function toggleMode() {
	return appStore.toggleSearchMode();
}
</script>

<button type="button" class="hidden" data-hotkey="Mod+j" onclick={toggleMode}>Toggle Search Mode</button>

<SegmentedControl size="md" items={items} />
