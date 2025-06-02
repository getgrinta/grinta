<script lang="ts">
  import {
    PanelLeftIcon,
    Volume2Icon,
    VolumeOffIcon,
    XIcon,
  } from "lucide-svelte";
  import { sendMessage } from "webext-bridge/popup";
  import {
    draggable,
    droppable,
    type DragDropOptions,
  } from "@thisux/sveltednd";
  import SidebarTabContextMenu from "./sidebar-tab-context-menu.svelte";
  import clsx from "clsx";
  import { colorVariant, faviconVariant } from "$lib/const";
  import type { DraggableOptions } from "$lib/types";
  import { FastAverageColor } from "fast-average-color";

  let {
    color,
    tab,
    draggableConfig,
    droppableConfig,
  }: {
    color: chrome.tabGroups.Color;
    tab: chrome.tabs.Tab;
    draggableConfig: DraggableOptions<{ index: number; type: string }>;
    droppableConfig: DragDropOptions<{ index: number; type: string }>;
  } = $props();

  let faviconElement = $state<HTMLImageElement>();
  const faviconMode = $derived(
    faviconElement ? getFaviconMode(faviconElement) : undefined,
  );

  let showFaviconFallback = $state(false);

  function handleFaviconError() {
    showFaviconFallback = true;
  }

  function handleClick() {
    return sendMessage("grinta_activateTab", { tabId: tab.id }, "background");
  }

  function handleClose() {
    return sendMessage("grinta_closeTab", { tabId: tab.id }, "background");
  }

  function toggleMute() {
    return sendMessage("grinta_toggleMuteTab", { tabId: tab.id }, "background");
  }

  function getFaviconMode(element: HTMLImageElement) {
    const fac = new FastAverageColor();
    const result = fac.getColor(element as never);
    return result;
  }
</script>

<SidebarTabContextMenu {tab}>
  <!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <li
    class={clsx(
      "flex btn w-full flex-1 flex-row items-center group border-2 flex-nowrap border-transparent cursor-pointer p-0",
      tab.active
        ? ["shadow-xs", colorVariant[color as chrome.tabGroups.Color]]
        : "btn-ghost",
    )}
    use:draggable={draggableConfig}
    use:droppable={droppableConfig}
    role="button"
    aria-label={tab.title}
  >
    <button
      class="flex flex-1 min-w-0 gap-2 p-2 h-full items-center cursor-pointer"
      onclick={handleClick}
      data-btn-activate
    >
      {#if tab.audible}
        <button class="btn btn-square btn-xs btn-ghost" onclick={toggleMute}>
          {#if tab.mutedInfo?.muted}
            <VolumeOffIcon size={24} class="w-6 h-6" />
          {:else}
            <Volume2Icon size={24} class="w-6 h-6" />
          {/if}
        </button>
      {/if}
      <div
        class={clsx(
          "btn btn-square btn-sm shadow-none relative rounded-[12px] flex justify-center items-center p-[2px]",
          tab.active
            ? "bg-transparent outline-none border-transparent"
            : "bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600",
        )}
      >
        {#if !tab.favIconUrl || showFaviconFallback}
          <PanelLeftIcon
            data-active={tab.active}
            size={20}
            class={clsx(
              "w-5 h-5",
              faviconVariant[color as chrome.tabGroups.Color],
            )}
          />
        {:else}
          <img
            bind:this={faviconElement}
            class={clsx(
              "rounded-[10px] aspect-square pointer-events-none overflow-hidden",
            )}
            src={tab.favIconUrl}
            alt={tab.title}
            onerror={handleFaviconError}
          />
        {/if}
      </div>
      <span class="truncate text-left flex-1 min-w-0 h-full font-[400]"
        >{tab.title}</span
      >
    </button>
    <button
      class="hidden min-w-0 group-hover:flex items-center justify-center cursor-pointer px-2 py-1 rounded-full"
      onclick={handleClose}
      data-btn-close
    >
      <XIcon size={16} />
    </button>
  </li>
</SidebarTabContextMenu>
