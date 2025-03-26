<script lang="ts">
import { ColorModeValue } from "$lib/utils.svelte";
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

const css = new ColorModeValue(
	"shadow-zinc-400/30 border-zinc-400/30 bg-zinc-200/50",
	"shadow-base-300 !border-base-300 base-nonsemantic-dark bg-zinc-700/50",
);
</script>

<label
	for={labelFor}
	class={clsx("btn btn-sm shadow-xs", css.value)}
	data-hotkey={hotkey}
>
	{@render children?.()}
</label>
