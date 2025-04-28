<script lang="ts">
  import { onMount } from "svelte";
  import { sendMessage } from "webext-bridge/popup";
  import SidebarTab from "$lib/components/sidebar-tab.svelte";
  import { type DragDropState } from "@thisux/sveltednd";
  import { PlusIcon } from "lucide-svelte";
  import Layout from "$lib/components/layout.svelte";
  import { tabsStore } from "$lib/store/tabs.svelte";
  import SpacePicker from "$lib/components/space-picker.svelte";
  import { appStore } from "$lib/store/app.svelte";

  const spaceTabs = $derived(
    tabsStore.tabs.filter(
      (tab) => tab.groupId === appStore.data.currentSpaceId,
    ),
  );

  function handleDrop(state: DragDropState<{ index: string }>) {
    const { draggedItem, targetContainer } = state;
    const dragIndex = parseInt(draggedItem.index);
    const dropIndex = parseInt(targetContainer ?? "0");
    sendMessage(
      "grinta_swapTabs",
      {
        fromIndex: dragIndex,
        toIndex: dropIndex,
      },
      "background",
    );
  }

  async function handleNewTab() {
    await sendMessage(
      "grinta_newTab",
      { groupId: appStore.data.currentSpaceId },
      "background",
    );
    tabsStore.updateTabs();
  }

  onMount(() => {
    tabsStore.updateTabs();
    tabsStore.updateGroups();
    tabsStore.registerListeners();
    return () => {
      tabsStore.unregisterListeners();
    };
  });
</script>

<Layout>
  <SpacePicker />
  <h2 class="my-2">
    {tabsStore.groups.find((space) => space.id === appStore.data.currentSpaceId)
      ?.title}
  </h2>
  <button class="btn btn-ghost justify-start gap-2 p-2" onclick={handleNewTab}>
    <PlusIcon size={24} />
    <span>New Tab</span>
  </button>
  <ul class="flex flex-col">
    {#each spaceTabs as tab, index}
      <SidebarTab
        {tab}
        draggableConfig={{
          container: index.toString(),
          dragData: tab,
          interactive: ["[data-btn-close]", "[data-btn-activate]"],
        }}
        droppableConfig={{
          container: index.toString(),
          callbacks: { onDrop: handleDrop as never },
          attributes: {
            dragOverClass: "scale-105 border-yellow-300/50",
          },
        }}
      />
    {/each}
  </ul>
</Layout>
