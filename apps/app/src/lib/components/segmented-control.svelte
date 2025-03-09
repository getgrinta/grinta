<script lang="ts">
import clsx from "clsx";
type Item = {
    text: string;
    onClick: () => void;
    active?: boolean;
    shortcut?: string;
    icon?: any;
};

const { items, size = "md" } = $props<{
    items: Item[];
    size?: 'md' | 'lg';
}>();
</script>

<div class="join shadow-sm rounded-full overflow-hidden ring-1 ring-neutral-300/20">
    {#each items as item}
        <button 
            type="button" 
            class={clsx(
                `btn ${size === "lg" ? "btn-md" : "btn-sm"} join-item border-0 bg-base-100`, 
                item.active ? 'text-primary' : 'text-neutral-500'
            )}
            onclick={item.onClick}
        >
            {#if item.icon}
                <item.icon size={size === "md" ? 16 : 18} />
            {/if}
            {#if size === "lg" || item.active}
                <span>{item.text}</span>
            {/if}
            {#if item.shortcut}
                <span>{item.shortcut}</span>
            {/if}
        </button>
    {/each}
</div>
