<script lang="ts">
import { THEME } from "$lib/store/settings.svelte";
import { SystemThemeWatcher } from "$lib/utils.svelte";
import clsx from "clsx";
import type { Snippet } from "svelte";

const {
	children,
	for: labelFor,
	hotkey,
} = $props<{
	children: Snippet;
	for: string;
	hotkey?: string;
}>();

const systemThemeWatcher = new SystemThemeWatcher();

const css = $derived(
	systemThemeWatcher.theme === THEME.LIGHT
		? "shadow-neutral-400/30 border-neutral-400/30 bg-neutral-200/50"
		: "shadow-base-300 !border-base-300 base-nonsemantic-dark bg-base-100",
);
</script>

<label 
    for={labelFor}
    class={clsx("btn btn-sm shadow-xs", css)}
    data-hotkey={hotkey}
>
    {@render children?.()}
</label>
