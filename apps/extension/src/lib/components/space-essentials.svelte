<script lang="ts">
  import { colorVariant } from "$lib/const";
  import { tabsStore } from "$lib/store/tabs.svelte";
  import clsx from "clsx";
  import { slide } from "svelte/transition";
  import { sendMessage } from "webext-bridge/popup";
  import SpaceEssentialContextMenu from "./space-essential-context-menu.svelte";
  import { draggable, droppable, type DragDropState } from "@thisux/sveltednd";

  let { essentials } = $props<{
    essentials: chrome.bookmarks.BookmarkTreeNode[];
  }>();

  const currentTab = $derived(tabsStore.tabs.find((tab) => tab.active));
  const currentOrigin = $derived(
    currentTab?.url ? new URL(currentTab.url).origin : undefined,
  );
  function handleClick(essential: chrome.bookmarks.BookmarkTreeNode) {
    return sendMessage(
      "grinta_openEssential",
      { essentialId: essential.id },
      "background",
    );
  }

  async function handleDrop(state: DragDropState<{ index: string }>) {
    const { draggedItem, targetContainer } = state;
    const dragIndex = parseInt(draggedItem.index);
    const dropIndex = parseInt(targetContainer ?? "0");
    await sendMessage(
      "grinta_swapEssentials",
      {
        dragIndex,
        dropIndex,
        folder: tabsStore.currentSpace?.title ?? "",
      },
      "background",
    );
    return sendMessage("grinta_updateState", {}, "background");
  }

  function getTabByOrigin(origin: string) {
    return tabsStore.tabs.find((tab) => {
      if (!tab.url) return false;
      return new URL(tab.url).origin === origin;
    });
  }
</script>

<div
  class="grid grid-cols-6 sm:grid-cols-8 gap-1 mb-2 place-items-stretch"
  transition:slide
>
  {#each essentials as essential, index}
    {@const url = new URL(essential.url)}
    {@const active = currentOrigin === url.origin}
    {@const essentialTab = getTabByOrigin(url.origin)}
    {@const src =
      essentialTab?.favIconUrl ??
      `https://www.google.com/s2/favicons?domain=${url.hostname}`}
    <SpaceEssentialContextMenu
      groupName={tabsStore.currentSpace?.title ?? ""}
      {index}
    >
      <div class="tooltip tooltip-bottom w-full" data-tip={essential.title}>
        <button
          class={clsx(
            "btn relative w-full overflow-hidden p-1",
            active &&
              colorVariant[(tabsStore.currentSpace?.color as never) ?? "gray"],
          )}
          onclick={() => handleClick(essential)}
          use:draggable={{
            container: index.toString(),
            dragData: { ...essential, index },
          }}
          use:droppable={{
            container: index.toString(),
            callbacks: { onDrop: handleDrop as never },
          }}
        >
          <img
            {src}
            class="absolute inset-0 blur-lg w-8 h-8 rounded-full bg-white pointer-events-none opacity-40"
          />
          <img
            {src}
            class="w-6 h-6 aspect-square rounded-full bg-white pointer-events-none"
          />
        </button>
      </div>
    </SpaceEssentialContextMenu>
  {/each}
</div>
