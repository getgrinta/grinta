<script lang="ts">
	import { widgetsStore } from "$lib/store/widgets.svelte";
	import { ArrowLeftIcon, ArrowRightIcon, XIcon } from "lucide-svelte";
	import ContextMenu, { type MenuItem } from "./context-menu.svelte";
	import { _ } from "svelte-i18n";
	import { get } from "svelte/store";

	let widgetIndex = $state(0);

	function t(key: string, params: Record<string, string> = {}) {
		try {
			const translationFn = get(_);
			return translationFn(key, { values: params });
		} catch {
			return key;
		}
	}

	export function createContextMenuItems(index: number) {
		widgetIndex = index;
	}

	const contextMenuItems: MenuItem[] = $derived.by(() => {
		const menuItems: MenuItem[] = [];
		
		if (widgetIndex !== 0) {
			menuItems.push({
				label: t("widgets.contextMenu.moveLeft"),
				icon: ArrowLeftIcon as any,
				onClick: () => {
					if (widgetIndex > 0) {
						widgetsStore.moveWidget(widgetIndex, widgetIndex - 1);
					}
				},
			});
		}
		
		if (widgetIndex !== widgetsStore.data.widgets.length - 1) {
			menuItems.push({
				label: t("widgets.contextMenu.moveRight"),
				icon: ArrowRightIcon as any,
				onClick: () => {
					if (widgetIndex < widgetsStore.data.widgets.length - 1) {
						widgetsStore.moveWidget(widgetIndex, widgetIndex + 1);
					}
				},
			});
		}

		return [
			...menuItems,
			{
				label: t("widgets.contextMenu.remove"),
				icon: XIcon as any,
				onClick: () => {
					widgetsStore.removeWidget(widgetIndex);
				},
			},
		];
	});
</script>

<ContextMenu name="widgets" items={contextMenuItems} />
