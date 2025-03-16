<script lang="ts">
	import { THEME } from "$lib/store/settings.svelte";
	import { SystemThemeWatcher } from "$lib/system-theme-watcher.svelte";
	import clsx from "clsx";
	import type { Snippet } from "svelte";

	const {
		children,
		class: className,
		onclick,
		type = "submit",
		disabled,
	} = $props<{
		children: Snippet;
		type?: string;
		class?: string;
		onclick?: () => void;
		disabled?: boolean;
	}>();

	const systemThemeWatcher = new SystemThemeWatcher();
</script>

<button
	{type}
	class={clsx(
		`btn border-0`,
		systemThemeWatcher.theme === THEME.LIGHT
			? "shadow-neutral-400/30 shadow-xs border-neutral-400/30 bg-neutral-200/50"
			: "shadow-neutral-800/30 shadow-xs disabled:!bg-neutral-100/20 bg-base-100 base-nonsemantic-dark",
		className,
	)}
	{disabled}
	{onclick}
>
	{@render children?.()}
</button>
