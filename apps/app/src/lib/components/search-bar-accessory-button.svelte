<script lang="ts">
import { ColorModeValue } from "$lib/utils.svelte";
import clsx from "clsx";
import type { SvelteComponent } from "svelte";

const { children, onClick, hotkey, className } = $props<{
	onClick: () => void;
	className?: string;
	hotkey?: string;
	children?: () => SvelteComponent;
}>();

const css = new ColorModeValue(
	"shadow-zinc-400/30 border-zinc-400/30 bg-zinc-200/50",
	"shadow-base-300 !border-base-300 base-nonsemantic-dark bg-zinc-700/50",
);
</script>

<button
	type="button"
	class={clsx("btn btn-sm shadow-xs", css.value, className)}
	onclick={onClick}
	data-hotkey={hotkey}
>
	{@render children?.()}
</button>
