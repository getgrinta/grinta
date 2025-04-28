<script lang="ts">
  import { appStore } from "$lib/store/app.svelte";
  import {
    CircleDashedIcon,
    CircleDotDashedIcon,
    CogIcon,
    PlusIcon,
  } from "lucide-svelte";
  import { useRsv } from "@ryuz/rsv";
  import {
    draggable,
    droppable,
    type DragDropOptions,
    type DragDropState,
  } from "@thisux/sveltednd";
  import { tabsStore } from "$lib/store/tabs.svelte";
  import { sendMessage } from "webext-bridge/popup";
  import clsx from "clsx";
  import colors from "tailwindcss/colors";
  import { sortByIdOrder } from "$lib/utils.svelte";

  const router = useRsv();

  async function activateSpace(spaceId: number) {
    appStore.setCurrentSpaceId(spaceId);
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
    const draggedGroup = tabsStore.groups[dragIndex];
    const droppedGroup = tabsStore.groups[dropIndex];
    const tabsUpdate = [...tabsStore.groups];
    tabsUpdate[dragIndex] = droppedGroup;
    tabsUpdate[dropIndex] = draggedGroup;
    const groupIds = tabsUpdate.map((group) => group.id);
    console.log(">>>GID", groupIds);
    tabsStore.setGroupsCustomOrder(groupIds);
    await sendMessage(
      "grinta_organizeGroups",
      {
        groupIds,
      },
      "background",
    );
  }
</script>

<div class="flex items-center justify-between">
  <div class="flex flex-1 group items-center">
    {#each tabsStore.groups as space, index}
      {@const hex = colors[space.color as never]?.[500] ?? colors.gray[500]}
      <div class="tooltip tooltip-bottom" data-tip={space.title}>
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
            attributes: {
              dragOverClass: "scale-105 border-yellow-300/50",
            },
          }}
          onclick={() => activateSpace(space.id)}
        >
          {#if space.id === appStore.data.currentSpaceId}
            <CircleDotDashedIcon size={20} color={hex} />
          {:else}
            <CircleDashedIcon size={20} color={hex} />
          {/if}
        </button>
      </div>
    {/each}
    <button
      class="btn btn-sm gtn-ghost btn-square hidden group-hover:flex"
      onclick={() => tabsStore.addGroup()}
    >
      <PlusIcon size={16} />
    </button>
  </div>
  <button
    class="btn btn-sm btn-ghost btn-square"
    onclick={() => router?.navigate("/settings")}
  >
    <CogIcon size={20} />
  </button>
</div>
