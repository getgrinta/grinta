<script lang="ts">
import clsx from "clsx";
import { PressedKeys } from "runed";

const pressedKeys = new PressedKeys();
const isCmdPressed = $derived(pressedKeys.has("Meta"));

type Item = {
	text?: string;
	onClick: () => void;
	active?: boolean;
	hotkey?: string;
	shortcut?: string;
	testId?: string;
	icon?: any;
};

const { items, hidingLabels = false } = $props<{
	items: Item[];
	hidingLabels?: boolean;
}>();
</script>

<div
    class={clsx(
        "join shadow-sm rounded-full overflow-hidden border-0 ring-0",
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
            onclick={item.onClick}
            data-testid={item.testId}
        >
            {#if item.icon}
                <item.icon size={16}/>
            {/if}
            {#if item.text && item.active || !hidingLabels}
                <span>{item.text}</span>
            {/if}
            {#if item.shortcut && isCmdPressed && !item.active}
                <span>{item.shortcut}</span>
            {/if}
        </button>
    {/each}
</div>
