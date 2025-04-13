<script lang="ts">
  import { listen } from "@tauri-apps/api/event";
  import type { UnlistenFn } from "@tauri-apps/api/event";
  import clsx from "clsx";
  import type { SvelteComponent } from "svelte";
  import { _ } from "svelte-i18n";

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
  let searchQuery = $state("");
  let searchInput = $state<HTMLElement | null>(null);

  const {
    name,
    items = [],
    onhide,
    searchable = false,
  } = $props<{
    name: string;
    items: MenuItem[];
    onhide?: () => void;
    searchable?: boolean;
  }>();

  // Filter items based on search query
  const filteredItems = $derived.by(() => {
    const itemsToFilter: MenuItem[] = items;
    if (!searchQuery) {
      return items;
    }

    const lowerCaseQuery = searchQuery.toLowerCase();
    return itemsToFilter.filter((item) =>
      item.label.toLowerCase().includes(lowerCaseQuery),
    );
  });

  // Handle clicking outside to close the menu
  function onPageClick(event: MouseEvent) {
    if (
      event.target === menuElement ||
      menuElement?.contains(event.target as Node)
    )
      return;
    isVisible = false;
    onhide?.();
    x = 0;
    y = 0;
    searchQuery = "";
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
        const searchInputHeight = searchable ? 40 : 0;

        const approxHeight =
          Math.min(4, filteredItems.length) * 33 +
          (windowVerticalBias + verticalPadding + padding + searchInputHeight);
        const pixelsBelowWindow =
          window.innerHeight - (event.payload.y + approxHeight);
        const pixelsPastWindow =
          window.innerWidth - (event.payload.x + 200 + padding);

        x = event.payload.x + Math.min(0, pixelsPastWindow);
        y = event.payload.y + Math.min(0, pixelsBelowWindow);
        isVisible = true;

        setTimeout(() => {
          searchInput?.focus();
        }, 0);
      });

      unlistenHide = await listen("hide-context-menu", () => {
        isVisible = false;
        onhide?.();
        x = 0;
        y = 0;
        searchQuery = "";
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
      "overflow-hidden bg-base-300 rounded-box p-0 w-[240px] shadow-lg absolute z-50",
    )}
    style="left: {x}px; top: {y}px;"
    bind:this={menuElement}
  >
    {#if searchable}
      <div class="p-2">
        <input
          bind:this={searchInput}
          type="text"
          placeholder={$_("commands.contextMenu.search")}
          class="input input-sm w-full"
          bind:value={searchQuery}
        />
      </div>
    {/if}
    <div class="overflow-y-auto w-[240px] max-h-[150px]">
      <ul class="menu menu-vertical w-full">
        {#each filteredItems as item (item.label)}
          <li class="w-full">
            <a
              href={item.href || "#"}
              class="w-full flex items-center"
              onclick={() => {
                if (item.onClick) item.onClick();
                isVisible = false;
                searchQuery = "";
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
  </div>
{/if}
