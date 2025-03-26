<script lang="ts">
import { ColorModeValue } from "$lib/utils.svelte";
import clsx from "clsx";

const { text, onClick, shortcut, showShortcut } = $props<{
	text: string;
	onClick: () => void;
	shortcut?: string;
	showShortcut?: boolean;
}>();

const buttonClass = new ColorModeValue("text-zinc-700", "");
</script>

<button
    type="button"
    class={clsx(
        `btn btn-md border-0 bg-base-100`,
        buttonClass.value,
    )}
    onclick={onClick}
>
    <span>{text}</span>
    {#if showShortcut && shortcut}
        <span>{shortcut}</span>
    {/if}
</button>
