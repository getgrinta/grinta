<script lang="ts">
	import { THEME } from "$lib/store/settings.svelte";
	import { SystemThemeWatcher } from "$lib/system-theme-watcher.svelte";
	import { emit, listen } from "@tauri-apps/api/event";
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

				const approxHeight = Math.min(4, items.length) * 33 + (9 * 2);

				const pixelsBelowWindow = window.innerHeight - (event.payload.y + approxHeight);
				const pixelsPastWindow = window.innerWidth - (event.payload.x + 200);

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

	const systemThemeWatcher = new SystemThemeWatcher();
</script>

<svelte:body on:click={onPageClick} />

{#if isVisible}
	<div 
		class="max-h-[150px] overflow-y-scroll rounded-box shadow-lg absolute z-50"
		style="left: {x}px; top: {y}px;"
		bind:this={menuElement}
	>
		<ul
			class={clsx(
				"menu menu-vertical w-[200px] bg-base-200",
				systemThemeWatcher.theme === THEME.LIGHT
					? "bg-base-200"
					: "base-nonsemantic-dark bg-base-200",
			)}
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
	</div>
{/if}
