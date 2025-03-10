<script lang="ts">
    import { THEME } from "$lib/store/settings.svelte";
    import { SystemThemeWatcher } from "$lib/utils.svelte";
    import clsx from "clsx";

const { children, onclick, hotkey } = $props<{
	onClick: () => void;
	hotkey?: string;
}>();


const systemThemeWatcher = new SystemThemeWatcher();
</script>

<button 
    type="button" 
    class={clsx("btn btn-sm",  systemThemeWatcher.theme === THEME.LIGHT ? "shadow-neutral-400/30 shadow-xs border-neutral-400/30 bg-neutral-200/50" : "bg-neutral-700/50")}
    onclick={onclick}
    data-hotkey={hotkey}
>
{@render children?.()}
</button>
