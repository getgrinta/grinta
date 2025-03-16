<script lang="ts">
	import { widgetsStore } from "$lib/store/widgets.svelte";
	import { ArrowLeftIcon, ArrowRightIcon, XIcon } from "lucide-svelte";
	import ContextMenu, { type MenuItem } from "./context-menu.svelte";

	let widgetIndex = $state(0);

	export function createContextMenuItems(index: number) {
		widgetIndex = index;
	}

	const contextMenuItems: MenuItem[] = [
		{
			label: "Move Left",
			icon: ArrowLeftIcon as any,
			onClick: () => {
				if (widgetIndex > 0) {
					widgetsStore.moveWidget(widgetIndex, widgetIndex - 1);
				}
			},
		},
		{
			label: "Move Right",
			icon: ArrowRightIcon as any,
			onClick: () => {
				if (widgetIndex < widgetsStore.data.widgets.length - 1) {
					widgetsStore.moveWidget(widgetIndex, widgetIndex + 1);
				}
			},
		},
		{
			label: "Remove",
			icon: XIcon as any,
			onClick: () => {
				widgetsStore.removeWidget(widgetIndex);
			},
		},
	];
</script>

<ContextMenu name="widgets" items={contextMenuItems} />
