<script lang="ts">
  import { sendMessage } from "webext-bridge/popup";
  import SidebarTab from "$lib/components/sidebar-tab.svelte";
  import { type DragDropState } from "@thisux/sveltednd";
  import {
    ArrowLeftIcon,
    ArrowRightIcon,
    CircleDotIcon,
    PlusIcon,
  } from "lucide-svelte";
  import Layout from "$lib/components/layout.svelte";
  import { tabsStore } from "$lib/store/tabs.svelte";
  import SpacePicker from "$lib/components/space-picker.svelte";
  import SpaceEssentials from "$lib/components/space-essentials.svelte";
  import { useRsv } from "@ryuz/rsv";
  import { Gesture } from "@use-gesture/vanilla";
  import { onMount } from "svelte";

  const router = useRsv();
  let wheelElement = $state<HTMLDivElement>();
  let movementX = $state(0);

  const currentSpaceId = $derived(
    tabsStore.tabs.find((tab) => tab.active)?.groupId,
  );
  const currentSpaceTitle = $derived(
    tabsStore.groups.find((group) => group.id === currentSpaceId)?.title,
  );
  const currentSpaceEssentials = $derived(
    tabsStore.essentials?.[currentSpaceTitle ?? ""] ?? [],
  );
  const currentSpaceIndex = $derived(
    tabsStore.groups.findIndex((group) => group.id === currentSpaceId),
  );

  const spaceTabs = $derived(
    tabsStore.tabs.filter((tab) => tab.groupId === currentSpaceId),
  );
  const leftArrowOpacity = $derived(movementX / -32);
  const rightArrowOpacity = $derived(movementX / 32);
  const canGoBack = $derived(currentSpaceIndex > 0);
  const canGoForward = $derived(
    currentSpaceIndex < tabsStore.groups.length - 1,
  );

  function handleDrop(state: DragDropState<{ index: string }>) {
    const { draggedItem, targetContainer } = state;
    const dragIndex = parseInt(draggedItem.index);
    const dropIndex = parseInt(targetContainer ?? "0");
    const fromId = spaceTabs[dragIndex].id;
    const toId = spaceTabs[dropIndex].id;
    sendMessage(
      "grinta_swapTabs",
      {
        fromId,
        toId,
      },
      "background",
    );
  }

  async function handleNewTab() {
    await sendMessage(
      "grinta_newTab",
      { groupId: currentSpaceId },
      "background",
    );
  }

  onMount(() => {
    if (!wheelElement) return;
    const gesture = new Gesture(wheelElement, {
      onWheelEnd: (event) => {
        if (event.axis !== "x") return;
        movementX = 0;
        if (event.movement[0] > 32) {
          const sanitizedIndex =
            currentSpaceIndex < tabsStore.groups.length - 1
              ? currentSpaceIndex + 1
              : currentSpaceIndex;
          const groupId = tabsStore.groups[sanitizedIndex].id;
          return sendMessage("grinta_activateGroup", { groupId }, "background");
        }
        if (event.movement[0] < -32) {
          const sanitizedIndex =
            currentSpaceIndex > 0 ? currentSpaceIndex - 1 : currentSpaceIndex;
          const groupId = tabsStore.groups[sanitizedIndex].id;
          return sendMessage("grinta_activateGroup", { groupId }, "background");
        }
      },
      onWheel: (event) => {
        movementX = event.movement[0];
      },
    });
    return () => {
      gesture.destroy();
    };
  });
</script>

<Layout>
  <div class="flex flex-1 flex-col gap-2 p-2">
    <button
      class="btn btn-ghost btn-sm"
      onclick={() => router?.navigate("/settings")}
    >
      <CircleDotIcon size={20} />
      <span>{currentSpaceTitle}</span>
    </button>
    <div
      class="flex flex-col flex-1 relative"
      onwheel={(event) => event.preventDefault()}
      bind:this={wheelElement}
    >
      {#if canGoBack}
        <div
          class="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center pointer-events-none"
          style="opacity: {leftArrowOpacity};"
        >
          <ArrowLeftIcon size={24} />
        </div>
      {/if}
      {#if canGoForward}
        <div
          class="absolute right-0 top-0 bottom-0 w-8 flex items-center justify-center pointer-events-none"
          style="opacity: {rightArrowOpacity};"
        >
          <ArrowRightIcon size={24} />
        </div>
      {/if}
      {#if currentSpaceEssentials.length > 0}
        <SpaceEssentials essentials={currentSpaceEssentials} />
      {/if}
      <div class="flex flex-col flex-1 pb-12">
        <button
          class="btn btn-ghost justify-start w-full gap-2 p-2"
          onclick={handleNewTab}
        >
          <PlusIcon size={24} />
          <span class="flex-1 text-left">New Tab</span>
          <kbd class="kbd kbd-sm">⌘T</kbd>
        </button>
        {#each spaceTabs as tab, index}
          <SidebarTab
            {tab}
            draggableConfig={{
              container: index.toString(),
              dragData: { ...tab, index },
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
      </div>
    </div>
  </div>
  <div class="fixed bottom-14 z-10 w-full">
    <SpacePicker />
  </div>
</Layout>
