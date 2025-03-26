<script lang="ts">
import { THEME } from "$lib/store/settings.svelte";
import { systemThemeWatcher } from "$lib/system-theme-watcher.svelte";
import { ColorModeValue } from "$lib/utils.svelte";
import clsx from "clsx";
import { match } from "ts-pattern";
type Item = {
	text?: string;
	onClick: () => void;
	active?: boolean;
	hotkey?: string;
	shortcut?: string;
	testId?: string;
	icon?: any;
};

const { items, size = "md" } = $props<{
	items: Item[];
	size?: "md" | "lg";
}>();

const containerCss = new ColorModeValue("ring-zinc-300/20", "ring-zinc-900/20");

const buttonCss = new ColorModeValue("border-0", "border-zinc-800");
const deactivatedClass = new ColorModeValue("text-zinc-500", "text-zinc-100");
</script>

<div
    class={clsx(
        "join shadow-sm rounded-full overflow-hidden border-0 ring-0",
        containerCss.value,
    )}
>
    {#each items as item}
        {@const buttonActiveClass = (isActive: boolean) => {
            const background =
                size === "lg"
                    ? "bg-base-100"
                    : isActive
                      ? "bg-base-300"
                      : "bg-base-100";
            const foreground =
                size === "lg"
                    ? isActive
                        ? "text-primary"
                        : deactivatedClass.value
                    : isActive
                      ? "text-primary"
                      : "text-zinc-500";
            return match(systemThemeWatcher.theme)
                .with(THEME.LIGHT, () => (isActive ? foreground : foreground))
                .with(THEME.DARK, () =>
                    isActive
                        ? `border-0 ${background} ${foreground}`
                        : `${foreground} border-base-800 ${background}`,
                )
                .exhaustive();
        }}

        <button
            type="button"
            class={clsx(
                `btn ${size === "lg" ? "btn-md" : "btn-sm"} join-item border-1 !border-base-300/30 bg-base-100`,
                buttonCss.value,
                buttonActiveClass(item.active),
            )}
            data-hotkey={item.hotkey}
            onclick={item.onClick}
            data-testid={item.testId}
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
