<script lang="ts">
  import { tabsStore } from "$lib/store/tabs.svelte";
  import {
    draggable,
    droppable,
    type DragDropOptions,
  } from "@thisux/sveltednd";
  import clsx from "clsx";
  import {
    CircleDotIcon,
    CircleIcon,
    CircleDotDashedIcon,
    CircleDashedIcon,
    StarIcon,
    XIcon,
    TrashIcon,
  } from "lucide-svelte";
  import colors from "tailwindcss/colors";
  import { sendMessage } from "webext-bridge/popup";
  import { onClickOutside } from "runed";
  import type { DraggableOptions } from "$lib/types";

  let {
    space,
    draggableConfig,
    droppableConfig,
  }: {
    space: chrome.tabGroups.TabGroup;
    draggableConfig: DraggableOptions<{ index: number; type: string }>;
    droppableConfig: DragDropOptions<{ index: number; type: string }>;
  } = $props();
  let dropdownElement = $state<HTMLUListElement>();
  let contextMenuOpen = $state(false);

  const bookmarks = $derived(
    space.title ? tabsStore.essentials[space.title] : undefined,
  );

  function setContextMenuOpen(open: boolean) {
    contextMenuOpen = open;
  }

  function handleRightClick(event: MouseEvent) {
    event.preventDefault();
    setContextMenuOpen(true);
  }

  function activateSpace(event: MouseEvent, groupId: number) {
    event.preventDefault();
    event.stopPropagation();
    return sendMessage("grinta_activateGroup", { groupId }, "background");
  }

  const dotVariants: Record<chrome.tabGroups.Color, string> = {
    grey: "text-gray-700 dark:text-gray-300",
    red: "text-red-700 dark:text-red-300",
    orange: "text-orange-700 dark:text-orange-300",
    yellow: "text-yellow-700 dark:text-yellow-300",
    green: "text-green-700 dark:text-green-300",
    blue: "text-blue-700 dark:text-blue-300",
    purple: "text-purple-700 dark:text-purple-300",
    pink: "text-pink-700 dark:text-pink-300",
    cyan: "text-cyan-700 dark:text-cyan-300",
  };

  async function handleCloseGroup() {
    await sendMessage(
      "grinta_deleteGroup",
      { groupId: space.id },
      "background",
    );
    setContextMenuOpen(false);
  }

  async function handleMakeEssential() {
    await sendMessage(
      "grinta_createEssentialsFolder",
      { title: space.title },
      "background",
    );
    setContextMenuOpen(false);
  }

  async function handleRemoveEssential() {
    const folder = (await sendMessage(
      "grinta_findEssentialsFolder",
      { title: space.title },
      "background",
    )) as unknown as chrome.bookmarks.BookmarkTreeNode;
    if (!folder) return;
    await sendMessage(
      "grinta_deleteFolder",
      { folderId: folder.id },
      "background",
    );
    await sendMessage(
      "grinta_deleteGroup",
      { groupId: space.id },
      "background",
    );
    setContextMenuOpen(false);
  }

  onClickOutside(
    () => dropdownElement,
    () => setContextMenuOpen(false),
  );
</script>

<div class="tooltip tooltip-top" data-tip={space.title}>
  <details
    bind:open={contextMenuOpen}
    class={clsx("dropdown dropdown-top dropdown-center")}
  >
    <summary
      class={clsx("btn btn-sm btn-ghost btn-square", dotVariants[space.color])}
      use:draggable={draggableConfig}
      use:droppable={droppableConfig}
      onclick={(event) => activateSpace(event, space.id)}
      oncontextmenu={handleRightClick}
    >
      {#if bookmarks}
        {#if space.id === tabsStore.currentSpaceId}
          <CircleDotIcon size={24} />
        {:else}
          <CircleIcon size={24} />
        {/if}
      {:else if space.id === tabsStore.currentSpaceId}
        <CircleDotDashedIcon size={24} />
      {:else}
        <CircleDashedIcon size={24} />
      {/if}
    </summary>
    <ul
      bind:this={dropdownElement}
      class="dropdown-content menu bg-base-300 rounded-box z-1 w-52 p-2 shadow-sm"
    >
      {#if bookmarks}
        <li>
          <button class="text-red-500" onclick={handleRemoveEssential}>
            <TrashIcon size={16} />
            <span>Remove</span>
          </button>
        </li>
      {:else}
        <li>
          <button onclick={handleMakeEssential}>
            <StarIcon size={16} />
            <span>Make Essential</span>
          </button>
        </li>
      {/if}
      <li>
        <button onclick={handleCloseGroup}>
          <XIcon size={16} />
          <span>Close</span>
        </button>
      </li>
    </ul>
  </details>
</div>
