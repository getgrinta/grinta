<script lang="ts">
import { listen } from "@tauri-apps/api/event";
import type { UnlistenFn } from "@tauri-apps/api/event";
import clsx from "clsx";
import type { SvelteComponent } from "svelte";

// Types for menu items
export interface MenuItem {
	label: string;
	href?: string;
	icon?: typeof SvelteComponent;
	onClick?: () => void;
}

let x = $state(0);
let y = $state(0);
let menuElement = $state<HTMLElement | null>(null);
let isVisible = $state(false);

const { name, items = [] } = $props<{
	name: string;
	items: MenuItem[];
}>();

// Handle clicking outside to close the menu
function onPageClick(event: MouseEvent) {
	if (
		event.target === menuElement ||
		menuElement?.contains(event.target as Node)
	)
		return;
	isVisible = false;
	x = 0;
	y = 0;
}

// Setup event listeners
$effect(() => {
	let unlistenShow: UnlistenFn;
	let unlistenHide: UnlistenFn;

	async function setup() {
		unlistenShow = await listen<{
			x: number;
			y: number;
			name: string;
		}>("show-context-menu", (event) => {
			if (name !== event.payload.name) return;

			const verticalPadding = 34;
			const windowVerticalBias = 4;

			const padding = 3;

			const approxHeight =
				Math.min(4, items.length) * 33 +
				(windowVerticalBias + verticalPadding + padding);
			const pixelsBelowWindow =
				window.innerHeight - (event.payload.y + approxHeight);
			const pixelsPastWindow =
				window.innerWidth - (event.payload.x + 200 + padding);

			x = event.payload.x + Math.min(0, pixelsPastWindow);
			y = event.payload.y + Math.min(0, pixelsBelowWindow);
			isVisible = true;
		});

		unlistenHide = await listen("hide-context-menu", () => {
			isVisible = false;
			x = 0;
			y = 0;
		});
	}

	setup();

	return () => {
		if (unlistenShow) unlistenShow();
		if (unlistenHide) unlistenHide();
	};
});
</script>

<svelte:body on:click={onPageClick} />

{#if isVisible}
	<div
		class={clsx(
			"overflow-hidden bg-base-300 rounded-box p-0 w-[200px] shadow-lg absolute z-50",
		)}
		style="left: {x}px; top: {y}px;"
		bind:this={menuElement}
	>
		<div class="overflow-y-auto w-[200px] max-h-[150px]">
			<ul class="menu menu-vertical w-full">
				{#each items as item}
					<li class="w-full">
						<a
							href={item.href || "#"}
							class="w-full flex items-center"
							onclick={() => {
								if (item.onClick) item.onClick();
								isVisible = false;
							}}
						>
							{#if item.icon}
								<span class="mr-2">
									<svelte:component
										this={item.icon}
										size={16}
									/>
								</span>
							{/if}
							{item.label}
						</a>
					</li>
				{/each}
			</ul>
		</div>
	</div>
{/if}
