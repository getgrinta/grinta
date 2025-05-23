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

  async function handleDrop(
    state: DragDropState<{ index: string; type: string; id: number }>,
  ) {
    const { draggedItem, targetContainer } = state;
    const dragIndex = parseInt(draggedItem.index);
    const dropIndex = parseInt(targetContainer ?? "0");
    console.log("DROP1", draggedItem, targetContainer);
    if (draggedItem.type === "space") {
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
    if (draggedItem.type === "tab") {
      console.log("DROP2", draggedItem, targetContainer);
      const groupId = tabsStore.groups[dropIndex]?.id;
      if (!groupId) return;
      await sendMessage(
        "grinta_moveTabToGroup",
        {
          tabId: draggedItem.id,
          groupId,
        },
        "background",
      );
    }
  }

  function restoreGroup(title: string) {
    const color = rand(TAB_COLOR);
    return sendMessage("grinta_newGroup", { color, title }, "background");
  }
</script>

<div class="flex items-center justify-between py-2 relative">
  <div class="flex flex-1 items-center justify-center">
    <div
      class="flex bg-base-100/80 backdrop-blur border border-base-300 rounded-full pointer-events-auto"
    >
      {#each tabsStore.groups as space, index}
        <SpaceButton
          {space}
          draggableConfig={{
            container: index.toString(),
            dragData: { ...space, index, type: "space" },
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
    </div>
    <button
      class="btn btn-sm btn-square bg-base-100/80 backdrop-blur border border-base-300 rounded-full absolute right-2 top-2 pointer-events-auto"
      onclick={() => tabsStore.addGroup()}
    >
      <PlusIcon size={16} class="pointer-events-none" />
    </button>
  </div>
</div>
