<script lang="ts">
    import { commandsStore } from "$lib/store/commands.svelte";
    import { widgetsStore } from "$lib/store/widgets.svelte";
    import {
        clickListener,
        getIcon,
        handleContextMenu,
    } from "$lib/utils.svelte";
    import clsx from "clsx";
    import WidgetsContextMenu from "./widgets-context-menu.svelte";
    import { appMetadataStore } from "$lib/store/app-metadata.svelte";
    import { SystemThemeWatcher } from "$lib/system-theme-watcher.svelte";
    import { THEME } from "$lib/store/settings.svelte";

    let widgetsContextMenu = $state<WidgetsContextMenu>();
    const widgets = $derived(widgetsStore.data.widgets ?? []);
    const showWidgets = $derived(
        widgetsStore.showWidgets && commandsStore.scrollTop < 8,
    );
    const systemThemeWatcher = new SystemThemeWatcher();

    $effect(clickListener);
</script>

<WidgetsContextMenu bind:this={widgetsContextMenu} />

{#if showWidgets}
    <div
        class="absolute left-0 right-0 top-20 carousel gap-2 z-10 motion-opacity-in"
    >
        {#each widgets as widget, i}
            {@const IconComponent = getIcon(widget.data)}
            {@const icon = appMetadataStore.getIcon(widget.data)}
            <div
                class="carousel-item select-none"
                data-widget-index={i}
                oncontextmenu={(event) => {
                    widgetsContextMenu?.createContextMenuItems(i);
                    handleContextMenu({ event, name: "widgets" });
                }}
            >
                <button
                    type="button"
                    class={clsx(
                        "btn",
                        i === 0 && "ml-4",
                        i === widgets.length - 1 && "mr-4",
                        systemThemeWatcher.theme === THEME.LIGHT
                            ? "shadow-neutral-400/30 bg-base-100 text-gray-600 shadow-xs border-neutral-400/30 bg-neutral-200/50"
                            : "shadow-neutral-800/30 bg-base-100 shadow-xs border-1 border-gray-600 disabled:!bg-neutral-100/20 bg-base-100 base-nonsemantic-dark",
                    )}
                    onclick={() => commandsStore.handleCommand(widget.data)}
                >
                    {#if icon}
                        <img
                            src={icon}
                            alt={""}
                            width="32"
                            height="32"
                            class="w-6 h-6 object-contain"
                        />
                    {:else}
                        <IconComponent size={20} />
                    {/if}

                    <span
                        >{widget.data.localizedLabel ?? widget.data.label}</span
                    >
                </button>
            </div>
        {/each}
    </div>
{/if}
