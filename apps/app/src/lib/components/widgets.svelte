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

    let widgetsContextMenu = $state<WidgetsContextMenu>();
    const widgets = $derived(widgetsStore.data.widgets ?? []);

    $effect(clickListener);
</script>

<WidgetsContextMenu bind:this={widgetsContextMenu} />

{#if widgetsStore.showWidgets}
    <div class="absolute left-0 right-0 top-20 carousel gap-2 z-10">
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
