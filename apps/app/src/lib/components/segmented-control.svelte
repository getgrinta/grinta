<script lang="ts">
import { THEME } from "$lib/store/settings.svelte";
import { SystemThemeWatcher } from "$lib/utils.svelte";
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
	size?: "md" | "lg";
}>();

const systemThemeWatcher = new SystemThemeWatcher();

const containerCss = $derived(
	systemThemeWatcher.theme === THEME.LIGHT ?
		"ring-neutral-300/20" :
        "ring-neutral-300/20"
);
</script>

<div class={clsx("join shadow-sm rounded-full overflow-hidden ring-1", containerCss)}>
    {#each items as item}
        {@const buttonClass = systemThemeWatcher.theme === THEME.LIGHT ? "border-0" : "border-neutral-800"}
        {@const buttonActiveClass = (isActive: boolean) => systemThemeWatcher.theme === THEME.LIGHT ? (isActive ? 'text-primary' : 'text-neutral-500') : (isActive ? "border-0 bg-base-100" : "border-neutral-800 bg-neutral-800")}

        <button 
            type="button" 
            class={clsx(
                `btn ${size === "lg" ? "btn-md" : "btn-sm"} join-item bg-base-100`, 
                buttonClass,
                buttonActiveClass(item.active)
            )}
            onclick={item.onClick}
        >
            {#if item.icon}
                <item.icon size={size === "md" ? 16 : 18} />
            {/if}
            {#if size === "lg" || item.active || !item.icon}
                <span>{item.text}</span>
            {/if}
            {#if item.shortcut}
                <span>{item.shortcut}</span>
            {/if}
        </button>
    {/each}
</div>
