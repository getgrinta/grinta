<script lang="ts">
import { ColorModeValue } from "$lib/utils.svelte";
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

const buttonClass = new ColorModeValue(
	"shadow-zinc-400/30 shadow-xs border-zinc-400/30 bg-zinc-200/50",
	"shadow-zinc-800/30 shadow-xs disabled:!bg-zinc-100/20 bg-base-100 base-nonsemantic-dark",
);
</script>

<button
	{type}
	class={clsx(
		`btn border-0`,
		buttonClass.value,
		className,
	)}
	{disabled}
	{onclick}
>
	{@render children?.()}
</button>
