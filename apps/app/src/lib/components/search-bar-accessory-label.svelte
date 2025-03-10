<script lang="ts">
    import { THEME } from "$lib/store/settings.svelte";
    import { SystemThemeWatcher } from "$lib/utils.svelte";
    import clsx from "clsx";

const {
	children,
	for: labelFor,
	hotkey,
} = $props<{
	for: string;
	hotkey?: string;
}>();

const systemThemeWatcher = new SystemThemeWatcher();
</script>

<label 
    for={labelFor}
    class={clsx("btn btn-sm",  systemThemeWatcher.theme === THEME.LIGHT ? "shadow-neutral-400/30 shadow-xs border-neutral-400/30 bg-neutral-200/50" : "bg-neutral-700/50")}
    data-hotkey={hotkey}
>
    {@render children?.()}
</label>
