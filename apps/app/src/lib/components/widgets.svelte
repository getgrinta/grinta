<script lang="ts">
import { commandsStore } from "$lib/store/commands.svelte";
import { widgetsStore } from "$lib/store/widgets.svelte";
import {
	clickListener,
	ColorModeValue,
	getIcon,
	handleContextMenu,
} from "$lib/utils.svelte";
import clsx from "clsx";
import WidgetsContextMenu from "./widgets-context-menu.svelte";
import { appMetadataStore } from "$lib/store/app-metadata.svelte";

let widgetsContextMenu = $state<WidgetsContextMenu>();
const widgets = $derived(widgetsStore.data.widgets ?? []);
const showWidgets = $derived(
	widgetsStore.showWidgets && commandsStore.scrollTop < 8,
);
const buttonClass = new ColorModeValue(
	"text-zinc-600 shadow-xs border-zinc-300 bg-zinc-200",
	"text-zinc-100 shadow-xs border-1 border-zinc-700 bg-zinc-900",
);
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
                role="cell"
                tabindex={0}
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
                        buttonClass.value,
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
