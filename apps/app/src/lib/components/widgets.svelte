<script lang="ts">
import { commandsStore } from "$lib/store/commands.svelte";
import { widgetsStore } from "$lib/store/widgets.svelte";
import { clickListener, getIcon, handleContextMenu } from "$lib/utils.svelte";
import clsx from "clsx";
import { ArrowLeftIcon, ArrowRightIcon, XIcon } from "lucide-svelte";
import ContextMenu, { type MenuItem } from "./context-menu.svelte";

const widgets = $derived(widgetsStore.data.widgets ?? []);

const contextMenuItems: MenuItem[] = [
	{
		label: "Move Left",
		icon: ArrowLeftIcon as any,
		onClick: (context: unknown) => {
			const typedContext = context as { i: number };
			if (typedContext.i > 0) {
				widgetsStore.moveWidget(typedContext.i, typedContext.i - 1);
			}
		},
	},
	{
		label: "Move Right",
		icon: ArrowRightIcon as any,
		onClick: (context: unknown) => {
			const typedContext = context as { i: number };
			if (typedContext.i < widgets.length - 1) {
				widgetsStore.moveWidget(typedContext.i, typedContext.i + 1);
			}
		},
	},
	{
		label: "Remove",
		icon: XIcon as any,
		onClick: (context: unknown) => {
			const typedContext = context as { i: number };
			widgetsStore.removeWidget(typedContext.i);
		},
	},
];

$effect(clickListener);
</script>

<ContextMenu name="widgets" items={contextMenuItems} />

{#if widgetsStore.showWidgets}
    <div class="absolute left-0 right-0 top-20 carousel gap-2 z-10">
        {#each widgets as widget, i}
            {@const IconComponent = getIcon(widget.data.handler)}
            <div 
                class="carousel-item select-none" 
                data-widget-index={i}
                oncontextmenu={(event) => handleContextMenu({ event, name: "widgets", context: { i } })} 
            >
                <button type="button" class={clsx("btn", i === 0 && "ml-4", i === widgets.length - 1 && "mr-4")} onclick={() => commandsStore.handleCommand(widget.data)}>
                    <IconComponent size={20} />
                    <span>{widget.data.localizedLabel ?? widget.data.label}</span>
                </button>
            </div>
        {/each}
    </div>
{/if}
