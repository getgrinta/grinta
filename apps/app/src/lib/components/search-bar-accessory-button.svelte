<script lang="ts">
	import { THEME } from "$lib/store/settings.svelte";
	import { SystemThemeWatcher } from "$lib/system-theme-watcher.svelte";
	import clsx from "clsx";
	import type { SvelteComponent } from "svelte";

	const { children, onClick, hotkey, className } = $props<{
		onClick: () => void;
		className?: string;
		hotkey?: string;
		children?: () => SvelteComponent;
	}>();

	const systemThemeWatcher = new SystemThemeWatcher();

	const css = $derived(
		systemThemeWatcher.theme === THEME.LIGHT
			? "shadow-neutral-400/30 border-neutral-400/30 bg-neutral-200/50"
			: "shadow-base-300 !border-base-300 base-nonsemantic-dark bg-neutral-700/50",
	);
</script>

<button
	type="button"
	class={clsx("btn btn-sm shadow-xs", css, className)}
	onclick={onClick}
	data-hotkey={hotkey}
>
	{@render children?.()}
</button>
