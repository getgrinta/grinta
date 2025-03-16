<script lang="ts">
	import { emit, listen } from "@tauri-apps/api/event";
	import type { UnlistenFn } from "@tauri-apps/api/event";
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
				x = event.payload.x;
				y = event.payload.y;
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
	<ul
		class="menu bg-base-200 rounded-box shadow-lg absolute z-50"
		style="left: {x}px; top: {y}px;"
		bind:this={menuElement}
	>
		{#each items as item}
			<li>
				<a
					href={item.href || "#"}
					onclick={() => {
						if (item.onClick) item.onClick();
						isVisible = false;
					}}
				>
					{#if item.icon}
						<span class="mr-2">
							<svelte:component this={item.icon} size={16} />
						</span>
					{/if}
					{item.label}
				</a>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.menu {
		min-width: 200px;
	}
</style>
