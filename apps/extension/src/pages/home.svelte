<script lang="ts">
  import { sendMessage } from "webext-bridge/popup";
  import SidebarTab from "$lib/components/sidebar-tab.svelte";
  import { type DragDropState } from "@thisux/sveltednd";
  import {
    ArrowLeftIcon,
    ArrowRightIcon,
    ArrowRightToLineIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    PlusIcon,
    SearchIcon,
    SparklesIcon,
    UserIcon,
  } from "lucide-svelte";
  import Layout from "$lib/components/layout.svelte";
  import { tabsStore } from "$lib/store/tabs.svelte";
  import SpacePicker from "$lib/components/space-picker.svelte";
  import SpaceEssentials from "$lib/components/space-essentials.svelte";
  import { useRsv } from "@ryuz/rsv";
  import { Gesture } from "@use-gesture/vanilla";
  import { onMount } from "svelte";
  import { matchSorter } from "match-sorter";
  import ViewTitle from "$lib/components/view-title.svelte";
  import pDebounce from "p-debounce";
  import { authStore } from "$lib/store/auth.svelte";
  import { chatsStore } from "$lib/store/chats.svelte";

  const router = useRsv();
  let mode = $state<"tabs" | "editing">("tabs");
  let spaceNameInput = $state<HTMLInputElement>();
  let searchQuery = $state("");
  let wheelElement = $state<HTMLDivElement>();
  let movementX = $state(0);

  function toggleEditing() {
    if (mode === "editing") {
      mode = "tabs";
      return;
    }
    mode = "editing";
    setTimeout(() => {
      spaceNameInput?.focus();
    }, 1);
  }

  const currentTab = $derived(tabsStore.tabs.find((tab) => tab.active));
  const currentSpaceTitle = $derived(tabsStore.currentSpace?.title);
  const currentSpaceEssentials = $derived.by(() => {
    const essentials = tabsStore.essentials?.[currentSpaceTitle ?? ""] ?? [];
    if (searchQuery.length === 0) return essentials;
    return matchSorter(essentials, searchQuery, {
      keys: ["title", "url"],
    });
  });
  const currentSpaceIndex = $derived(
    tabsStore.groups.findIndex(
      (group) => group.id === tabsStore.currentSpaceId,
    ),
  );
  const chromiumWebsite = $derived(
    tabsStore.currentTab?.url?.startsWith("chrome://"),
  );

  const spaceTabs = $derived(
    tabsStore.tabs.filter((tab) => tab.groupId === tabsStore.currentSpaceId),
  );
  const currentTabIndex = $derived(
    spaceTabs.findIndex((tab) => tab.id === currentTab?.id),
  );
  const spaceTabsFiltered = $derived(
    searchQuery
      ? matchSorter(spaceTabs, searchQuery, {
          keys: ["title", "url"],
        })
      : spaceTabs,
  );
  const aiChatsFiltered = $derived(
    searchQuery
      ? matchSorter(chatsStore.data.chats, searchQuery, {
          keys: ["title"],
        })
      : [],
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
    const dropIndex = Number.isFinite(Number(targetContainer))
      ? parseInt(targetContainer!)
      : 0;
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
      { groupId: tabsStore.currentSpaceId },
      "background",
    );
  }

  async function searchKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      mode = "tabs";
      searchQuery = "";
    }
    if (event.key === "Enter") {
      if (spaceTabsFiltered[0]?.id) {
        await sendMessage(
          "grinta_activateTab",
          { tabId: spaceTabsFiltered[0].id },
          "background",
        );
      }
      mode = "tabs";
      searchQuery = "";
    }
    if (event.key === "Tab") {
      if (searchQuery.length === 0) return;
      if (!authStore.user) return;
      mode = "tabs";
      if (chromiumWebsite) return;
      return router?.navigate(
        "/chats?input=" + encodeURIComponent(searchQuery),
      );
    }
  }

  function handleShortcuts(event: KeyboardEvent) {
    const spaceKeys = [
      "Digit1",
      "Digit2",
      "Digit3",
      "Digit4",
      "Digit5",
      "Digit6",
      "Digit7",
      "Digit8",
      "Digit9",
    ];
    if (event.altKey && event.code === "Slash") {
      return router?.navigate("/settings");
    }
    if (event.altKey && spaceKeys.includes(event.code)) {
      const index = parseInt(event.code.replace("Digit", "")) - 1;
      const groupId = tabsStore.groups[index]?.id;
      if (!groupId) return;
      return sendMessage("grinta_activateGroup", { groupId }, "background");
    }
    if (event.altKey && event.code === "ArrowLeft") {
      const lastSpaceId = tabsStore.groups[tabsStore.groups.length - 1]?.id;
      const prevSpaceId = tabsStore.groups[currentSpaceIndex - 1]?.id;
      return sendMessage(
        "grinta_activateGroup",
        { groupId: prevSpaceId ?? lastSpaceId },
        "background",
      );
    }
    if (event.altKey && event.code === "ArrowRight") {
      const firstSpaceId = tabsStore.groups[0]?.id;
      const nextSpaceId = tabsStore.groups[currentSpaceIndex + 1]?.id;
      return sendMessage(
        "grinta_activateGroup",
        { groupId: nextSpaceId ?? firstSpaceId },
        "background",
      );
    }
    if (event.altKey && event.code === "ArrowDown") {
      const firstTabId = spaceTabs[0]?.id;
      const nextTabId = spaceTabs[currentTabIndex + 1]?.id ?? firstTabId;
      if (!nextTabId) return;
      return sendMessage(
        "grinta_activateTab",
        { tabId: nextTabId },
        "background",
      );
    }
    if (event.altKey && event.code === "ArrowUp") {
      const lastTabId = spaceTabs[spaceTabs.length - 1]?.id;
      const prevTabId = spaceTabs[currentTabIndex - 1]?.id ?? lastTabId;
      if (!prevTabId) return;
      return sendMessage(
        "grinta_activateTab",
        { tabId: prevTabId },
        "background",
      );
    }
  }

  function updateGroupTitle(groupId: number, title: string) {
    if (!title) return;
    if (title.length < 1 || title.length > 32) return;
    const group = tabsStore.groups.find((group) => group.id === groupId);
    if (!group) return;
    return sendMessage(
      "grinta_updateGroup",
      { groupId, color: group.color, title },
      "background",
    );
  }

  async function nameKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      return spaceNameInput?.blur();
    }
    if (event.key === "Enter") {
      return spaceNameInput?.blur();
    }
  }

  function activateGroup(groupId: number) {
    return sendMessage("grinta_activateGroup", { groupId }, "background");
  }

  const debouncedActivateGroup = pDebounce(activateGroup, 80);

  onMount(() => {
    if (!wheelElement) return;
    const gesture = new Gesture(
      wheelElement,
      {
        onWheel: (event) => {
          movementX = event.movement[0];
          if (event.movement[0] > 32) {
            const sanitizedIndex =
              currentSpaceIndex < tabsStore.groups.length - 1
                ? currentSpaceIndex + 1
                : currentSpaceIndex;
            const groupId = tabsStore.groups[sanitizedIndex].id;
            return debouncedActivateGroup(groupId);
          }
          if (event.movement[0] < -32) {
            const sanitizedIndex =
              currentSpaceIndex > 0 ? currentSpaceIndex - 1 : currentSpaceIndex;
            const groupId = tabsStore.groups[sanitizedIndex].id;
            return debouncedActivateGroup(groupId);
          }
        },
        onWheelEnd: () => {
          movementX = 0;
        },
      },
      { wheel: { axis: "x" } },
    );
    document.body.addEventListener("keydown", handleShortcuts);
    authStore.fetchSession();
    return () => {
      gesture.destroy();
      document.body.removeEventListener("keydown", handleShortcuts);
    };
  });
</script>

<Layout>
  {#if currentSpaceTitle}
    <div class="fixed top-0 left-0 right-0 z-100">
      <ViewTitle title={currentSpaceTitle}>
        {#snippet titleElement()}
          {#if mode === "tabs"}
            <button
              class="btn btn-sm btn-ghost flex-1 justify-start text-[1rem] truncate"
              onclick={toggleEditing}
            >
              {currentSpaceTitle}
            </button>
          {/if}
          {#if mode === "editing"}
            <input
              type="text"
              bind:this={spaceNameInput}
              class="input input-sm w-full"
              value={currentSpaceTitle}
              onblur={toggleEditing}
              onkeydown={nameKeyDown}
              oninput={(event) => {
                if (!tabsStore.currentSpaceId) return;
                const value = (event.target as HTMLInputElement)?.value ?? "";
                if (!value) return;
                if (value.length < 1 || value.length > 32) return;
                return updateGroupTitle(tabsStore.currentSpaceId, value);
              }}
              placeholder="Space name"
            />
          {/if}
        {/snippet}
        {#snippet addon()}
          <div class="flex items-center">
            <button
              class="btn btn-sm btn-square btn-ghost"
              onclick={() => tabsStore.prevSpace()}
            >
              <ChevronLeftIcon size={20} />
            </button>
            <button
              class="btn btn-sm btn-square btn-ghost"
              onclick={() => tabsStore.nextSpace()}
            >
              <ChevronRightIcon size={20} />
            </button>
            <a
              href={authStore.user
                ? "https://getgrinta.com/account"
                : "https://getgrinta.com/sign-in"}
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-sm btn-square rounded-full btn-ghost"
            >
              {#if authStore.user}
                <img
                  src={`https://meshy.studio/api/mesh/${authStore.user.id}?noise=8&sharpen=1&negate=false&gammaIn=2.1&gammaOut=2.2&brightness=100&saturation=100&hue=0&lightness=0&blur=0`}
                  alt="Avatar"
                  class="w-6 rounded-full"
                />
              {:else}
                <UserIcon size={20} />
              {/if}
            </a>
          </div>
        {/snippet}
      </ViewTitle>
    </div>
  {/if}
  <div class="flex flex-1 flex-col pt-14 p-2">
    <div class="flex flex-col flex-1 relative" bind:this={wheelElement}>
      {#if canGoBack}
        <div
          class="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center pointer-events-none"
          style="opacity: {leftArrowOpacity};"
        >
          <button class="btn btn-sm btn-square">
            <ArrowLeftIcon size={24} />
          </button>
        </div>
      {/if}
      {#if canGoForward}
        <div
          class="absolute right-0 top-0 bottom-0 w-8 flex items-center justify-center pointer-events-none"
          style="opacity: {rightArrowOpacity};"
        >
          <button class="btn btn-sm btn-square">
            <ArrowRightIcon size={24} />
          </button>
        </div>
      {/if}
      <label class="input w-full">
        <SearchIcon size={20} />
        <input
          placeholder="Search or ask AI..."
          bind:value={searchQuery}
          onkeydown={searchKeyDown}
        />
        {#if authStore.user && !chromiumWebsite}
          <kbd class="kbd kbd-sm gap-1">
            <ArrowRightToLineIcon size={16} class="w-6 h-6" />
            <span class="text-xs font-semibold">AI</span>
          </kbd>
        {/if}
      </label>
      {#if currentSpaceEssentials.length > 0}
        <SpaceEssentials essentials={currentSpaceEssentials} />
      {/if}
      <div class="flex flex-col flex-1 pb-12 mt-2">
        {#if searchQuery.length === 0}
          <button
            class="btn btn-ghost justify-start w-full gap-2 p-2"
            onclick={handleNewTab}
          >
            <PlusIcon size={20} class="ml-1" />
            <span class="flex-1 text-left ml-1">New Tab</span>
            <kbd class="kbd kbd-sm">⌘T</kbd>
          </button>
        {/if}
        {#each spaceTabsFiltered as tab, index}
          <SidebarTab
            {tab}
            color={tabsStore.currentSpace?.color ?? "blue"}
            draggableConfig={{
              container: index.toString(),
              dragData: { ...tab, index, type: "tab" },
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
        {#if aiChatsFiltered.length > 0}
          <div class="flex flex-col mt-2">
            <h2 class="text-sm font-semibold mb-2">AI Chats</h2>
            {#each aiChatsFiltered as chat}
              <button
                onclick={() => router?.navigate("/chats/" + chat.id)}
                class="btn btn-ghost justify-start w-full gap-3"
              >
                <SparklesIcon size={20} />
                <span class="font-medium">{chat.title}</span>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
  <div class="fixed bottom-14 z-100 w-full pointer-events-none">
    <SpacePicker />
  </div>
</Layout>
