<script lang="ts">
import clsx from "clsx";

const { children, class: className, onclick, disabled } = $props<{
    class?: string;
	onclick: () => void;
	disabled?: boolean;
}>();
</script>


<button 
    type="button" 
    class={clsx(
        `btn shadow-neutral-400/30 shadow-xs border-neutral-400/30 bg-neutral-200/50`,
        className,
    )}
    disabled={disabled}
    onclick={onclick}
>
    {@render children?.()}
</button>
