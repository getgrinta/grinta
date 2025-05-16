<script lang="ts">
  import {
    CircleDashedIcon,
    CircleDotDashedIcon,
    CircleDotIcon,
    CircleFadingPlusIcon,
    CircleIcon,
    PlusIcon,
  } from "lucide-svelte";
  import { draggable, droppable, type DragDropState } from "@thisux/sveltednd";
  import { tabsStore } from "$lib/store/tabs.svelte";
  import { sendMessage } from "webext-bridge/popup";
  import clsx from "clsx";
  import colors from "tailwindcss/colors";
  import { rand } from "$lib/utils.svelte";
  import { TAB_COLOR } from "$lib/const";

  const currentSpaceId = $derived(
    tabsStore.tabs.find((tab) => tab.active)?.groupId,
  );

  const nonRestoredGroups = $derived(
    Object.keys(tabsStore.essentials).filter(
      (key) => !tabsStore.groups.some((group) => group.title === key),
    ),
  );

  async function activateSpace(spaceId: number) {
    await sendMessage(
      "grinta_activateGroup",
      { groupId: spaceId },
      "background",
    );
  }

  async function handleDrop(state: DragDropState<{ index: number }>) {
    const { draggedItem, targetContainer } = state;
    const dragIndex = draggedItem.index;
    const dropIndex = parseInt(targetContainer ?? "0");
    if (dragIndex === dropIndex) return;
    await sendMessage(
      "grinta_swapGroups",
      {
        fromIndex: dragIndex,
        toIndex: dropIndex,
      },
      "background",
    );
  }

  function restoreGroup(title: string) {
    const color = rand(TAB_COLOR);
    return sendMessage("grinta_newGroup", { color, title }, "background");
  }
</script>

<div
  class="flex items-center justify-between bg-gradient-to-b from-base-100/0 to-base-100 py-2 relative"
>
  <div class="flex flex-1 group items-center justify-center">
    {#each tabsStore.groups as space, index}
      {@const hex = colors[space.color as never]?.[500] ?? colors.gray[500]}
      {@const bookmarks = space.title
        ? tabsStore.essentials[space.title]
        : undefined}
      <div class="tooltip tooltip-top" data-tip={space.title}>
        <button
          class={clsx(
            "btn btn-sm btn-ghost btn-square",
            `text-${space.color}-500`,
          )}
          use:draggable={{
            container: index.toString(),
            dragData: { ...space, index },
            interactive: ["[data-btn-close]", "[data-btn-activate]"],
          }}
          use:droppable={{
            container: index.toString(),
            callbacks: { onDrop: handleDrop as never },
          }}
          onclick={() => activateSpace(space.id)}
        >
          {#if bookmarks}
            {#if space.id === currentSpaceId}
              <CircleDotIcon size={24} color={hex} />
            {:else}
              <CircleIcon size={24} color={hex} />
            {/if}
          {:else if space.id === currentSpaceId}
            <CircleDotDashedIcon size={24} color={hex} />
          {:else}
            <CircleDashedIcon size={24} color={hex} />
          {/if}
        </button>
      </div>
    {/each}
    {#each nonRestoredGroups as title}
      <div class="tooltip tooltip-top" data-tip={title}>
        <button
          class="btn btn-sm btn-ghost btn-square"
          onclick={() => restoreGroup(title)}
        >
          <CircleFadingPlusIcon size={24} />
        </button>
      </div>
    {/each}
    <button
      class="btn btn-sm gtn-ghost btn-square hidden group-hover:flex absolute right-2 top-1/2 -translate-y-1/2"
      onclick={() => tabsStore.addGroup()}
    >
      <PlusIcon size={16} />
    </button>
  </div>
</div>
