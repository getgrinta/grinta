<script lang="ts">
import { THEME } from "$lib/store/settings.svelte";
import { SystemThemeWatcher } from "$lib/system-theme-watcher.svelte";
import clsx from "clsx";
import { match } from "ts-pattern";

const { items, size = "md" } = $props();

const systemThemeWatcher = new SystemThemeWatcher();

const containerCss = $derived(
	systemThemeWatcher.theme === THEME.LIGHT
		? "ring-neutral-300/20"
		: "ring-neutral-900/20",
);
</script>

<div class={clsx("join shadow-sm rounded-full overflow-hidden border-0 ring-0", containerCss)}>
    {#each items as item}
        {@const buttonClass = systemThemeWatcher.theme === THEME.LIGHT ? "border-0" : "border-neutral-800"}
        {@const buttonActiveClass = (isActive: boolean) => {
            const background = (size === "lg") ? "bg-base-100" : (isActive ? "bg-base-300" : "bg-base-100");
            const foreground = (size === "lg") ?  (isActive ? "text-primary" : systemThemeWatcher.theme === THEME.DARK ? "text-neutral-100" : "text-neutral-500") : (isActive ? "text-primary" : "text-neutral-500");
            return match(systemThemeWatcher.theme)
                .with(THEME.LIGHT, () => isActive ? foreground : foreground)
                .with(THEME.DARK, () => isActive ? `border-0 ${background} ${foreground}` : `${foreground} border-base-800 ${background}`)
                .exhaustive()
        }}

        <button 
            type="button" 
            class={clsx(
                `btn ${size === "lg" ? "btn-md" : "btn-sm"} join-item border-1 !border-base-300/30 bg-base-100`, 
                buttonClass,
                buttonActiveClass(item.active)
            )}
            data-hotkey={item.hotkey}
            onclick={() => {
                if (!item.active) {
                    item.onClick();
                    return;
                }

                // When active item is clicked, activate the other item (there are only 2 items)
                const otherItem = items.find((i: any) => i !== item);
                if (otherItem) {
                    otherItem.onClick();
                }
            }}
        >
            {#if item.icon}
                <item.icon size={size === "md" ? 16 : 18} />
            {/if}
            {#if item.text && (size === "lg" || item.active || !item.icon)}
                <span>{item.text}</span>
            {/if}
            {#if item.shortcut}
                <span>{item.shortcut}</span>
            {/if}
        </button>
    {/each}
</div>
