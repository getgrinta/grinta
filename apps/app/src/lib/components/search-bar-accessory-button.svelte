<script lang="ts">
const { children, onclick, hotkey } = $props<{
	onClick: () => void;
	hotkey?: string;
}>();
</script>

<button 
    type="button" 
    class="btn btn-sm shadow-neutral-400/30 shadow-xs border-neutral-400/30 bg-neutral-200/50" 
    onclick={onclick}
    data-hotkey={hotkey}
>
{@render children?.()}
</button>
