<script lang="ts">
import clsx from "clsx";

const { text, onClick, shortcut, showShortcut } = $props<{
	text: string;
	onClick: () => void;
	shortcut?: string;
	showShortcut?: boolean;
}>();
</script>


<button 
    type="button" 
    class={clsx(
        `btn btn-md border-0 bg-base-100`, 
        'text-neutral-700'
    )}
    onclick={onClick}
>
    <span>{text}</span>
    {#if showShortcut && shortcut}
        <span>{shortcut}</span>
    {/if}
</button>
