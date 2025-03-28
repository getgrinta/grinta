<script lang="ts">
import clsx from "clsx";

type Item = {
	icon?: any;
	text?: string;
	shortcut?: string;
	onClick: () => void;
	active: boolean;
	hotkey?: string;
};

const { items } = $props<{ items: Item[] }>();
</script>

<div
    class={clsx(
        "join shadow-sm rounded-full overflow-hidden border-0 ring-0 pointer-events-auto",
    )}
>
    {#each items as item}
        <button
            type="button"
            class={clsx(
                "btn btn-sm join-item",
                item.active && "btn-primary"
            )}
            data-hotkey={item.hotkey}
            onclick={() => {
                if (!item.active) {
                    item.onClick();
                    return;
                }

                // When active item is clicked, activate the other item (there are only 2 items)
                const otherItem = items.find((i: Item) => i !== item);
                if (otherItem) {
                    otherItem.onClick();
                }
            }}
        >
            {#if item.icon}
                <item.icon size={16} />
            {/if}
            {#if item.text && (item.active || !item.icon)}
                <span>{item.text}</span>
            {/if}
            {#if item.shortcut}
                <span>{item.shortcut}</span>
            {/if}
        </button>
    {/each}
</div>
