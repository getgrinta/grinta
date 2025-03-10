<script lang="ts">
import { THEME } from "$lib/store/settings.svelte";
import { SystemThemeWatcher } from "$lib/utils.svelte";
import clsx from "clsx";
import type { Snippet } from "svelte";

const {
	children,
	class: className,
	onclick,
	disabled,
} = $props<{
	children: Snippet;
	class?: string;
	onclick: () => void;
	disabled?: boolean;
}>();

const systemThemeWatcher = new SystemThemeWatcher();
</script>

<button 
    type="button" 
    class={clsx(
        `btn`,
        systemThemeWatcher.theme === THEME.LIGHT && "shadow-neutral-400/30 shadow-xs border-neutral-400/30 bg-neutral-200/50",
        className,
    )}
    disabled={disabled}
    onclick={onclick}
>
    {@render children?.()}
</button>
