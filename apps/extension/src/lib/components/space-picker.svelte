<script lang="ts">
  import { CircleFadingPlusIcon, PlusIcon } from "lucide-svelte";
  import { type DragDropState } from "@thisux/sveltednd";
  import { tabsStore } from "$lib/store/tabs.svelte";
  import { sendMessage } from "webext-bridge/popup";
  import { rand } from "$lib/utils.svelte";
  import { TAB_COLOR } from "$lib/const";
  import SpaceButton from "./space-button.svelte";

  const nonRestoredGroups = $derived(
    Object.keys(tabsStore.essentials).filter(
      (key) => !tabsStore.groups.some((group) => group.title === key),
    ),
  );

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
      <SpaceButton
        {space}
        draggableConfig={{
          container: index.toString(),
          dragData: { ...space, index },
          interactive: ["[data-btn-close]", "[data-btn-activate]"],
        }}
        droppableConfig={{
          container: index.toString(),
          callbacks: { onDrop: handleDrop as never },
        }}
      />
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
      class="btn btn-sm gtn-ghost btn-square hidden group-hover:flex absolute right-2 top-2"
      onclick={() => tabsStore.addGroup()}
    >
      <PlusIcon size={16} class="pointer-events-none" />
    </button>
  </div>
</div>
