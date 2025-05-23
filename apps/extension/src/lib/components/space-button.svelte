<script lang="ts">
  import { tabsStore } from "$lib/store/tabs.svelte";
  import { draggable, droppable } from "@thisux/sveltednd";
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

  let { space, draggableConfig, droppableConfig } = $props<{
    space: chrome.tabGroups.TabGroup;
    draggableConfig: object;
    droppableConfig: object;
  }>();
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

  const hex = colors[space.color as never]?.[500] ?? colors.gray[500];

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
      class={clsx("btn btn-sm btn-ghost btn-square", `text-${space.color}-500`)}
      use:draggable={draggableConfig}
      use:droppable={droppableConfig}
      onclick={(event) => activateSpace(event, space.id)}
      oncontextmenu={handleRightClick}
    >
      {#if bookmarks}
        {#if space.id === tabsStore.currentSpaceId}
          <CircleDotIcon size={24} color={hex} />
        {:else}
          <CircleIcon size={24} color={hex} />
        {/if}
      {:else if space.id === tabsStore.currentSpaceId}
        <CircleDotDashedIcon size={24} color={hex} />
      {:else}
        <CircleDashedIcon size={24} color={hex} />
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
