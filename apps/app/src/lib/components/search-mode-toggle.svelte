<script lang="ts">
import { SEARCH_MODE, appStore } from "$lib/store/app.svelte";
import { GlobeIcon, SparklesIcon } from "lucide-svelte";
import { _ } from "svelte-i18n";
import Toggle from "./toggle.svelte";

const items = $derived([
	{
		icon: GlobeIcon,
		text: $_(`searchMode.${SEARCH_MODE.WEB.toLowerCase()}`),
		onClick: () => {
			appStore.searchMode = SEARCH_MODE.WEB;
		},
		active: appStore.searchMode === SEARCH_MODE.WEB,
	},
	{
		icon: SparklesIcon,
		text: $_(`searchMode.${SEARCH_MODE.AI.toLowerCase()}`),
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

<button type="button" class="hidden" data-hotkey="Mod+j" onclick={toggleMode}
	>Toggle Search Mode</button
>

<Toggle {items} />
