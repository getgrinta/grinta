<script lang="ts">
  import type { Snippet } from "svelte";
  import { ContextMenu } from "bits-ui";
  import {
    ChevronRightIcon,
    CopyIcon,
    CopyPlusIcon,
    ListStartIcon,
    ListXIcon,
    PaperclipIcon,
    PlusIcon,
    RefreshCwIcon,
    ShareIcon,
    StarIcon,
    Volume2Icon,
    VolumeOffIcon,
    XIcon,
  } from "lucide-svelte";
  import { sendMessage } from "webext-bridge/popup";
  import { toast } from "svelte-sonner";
  import { tabsStore } from "$lib/store/tabs.svelte";
  import { GetContentSchema } from "$lib/schema";
  import { sessionStorage } from "$lib/storage";
  import { useRsv } from "@ryuz/rsv";

  type Props = ContextMenu.RootProps & {
    children: Snippet;
    tab: chrome.tabs.Tab;
  };

  let { open = $bindable(false), tab, children }: Props = $props();
  let mode = $state<"context" | "spaces">("context");
  let router = useRsv();
  const filteredGroups = $derived(
    tabsStore.groups.filter((group) => group.id !== tabsStore.currentSpaceId),
  );
  const chromiumWebsite = $derived(tab.url?.startsWith("chrome://"));

  function handleNewTab() {
    sendMessage("grinta_newTab", { tabId: tab.id }, "background");
    open = false;
  }

  function handleReload() {
    sendMessage("grinta_reloadTab", { tabId: tab.id }, "background");
    open = false;
  }

  function handleDuplicate() {
    sendMessage("grinta_duplicateTab", { tabId: tab.id }, "background");
    open = false;
  }

  function handleMute() {
    sendMessage("grinta_toggleMuteTab", { tabId: tab.id }, "background");
    open = false;
  }

  function handleClose() {
    sendMessage("grinta_closeTab", { tabId: tab.id }, "background");
    open = false;
  }

  function handleCloseOtherTabs() {
    sendMessage("grinta_closeOtherTabs", { tabId: tab.id }, "background");
    open = false;
  }

  function handleAddToEssentials() {
    sendMessage("grinta_addToEssentials", { tabId: tab.id }, "background");
    open = false;
  }

  function handleCopyUrl() {
    navigator.clipboard.writeText(tab.url ?? "");
    toast.success("URL copied to clipboard");
    open = false;
  }

  async function handleShare() {
    const shareData = {
      title: tab.title ?? "",
      url: tab.url ?? "",
    };
    const canShare = navigator.canShare(shareData);
    if (!canShare) {
      open = false;
      return;
    }
    try {
      await navigator.share(shareData);
    } catch (error) {
      console.error("Error sharing:", error);
    }
    open = false;
  }

  async function handleSendToSpace() {
    mode = "spaces";
  }

  async function sendTabToSpace(spaceId: number) {
    await sendMessage(
      "grinta_moveTabToGroup",
      { tabId: tab.id, groupId: spaceId },
      "background",
    );
    mode = "context";
    open = false;
  }

  async function attachTabToChat() {
    await sendMessage("grinta_activateTab", { tabId: tab.id }, "background");
    const response = await sendMessage(
      "grinta_fetchPage",
      { tabId: tab.id },
      "background",
    );
    const currentPageContext = GetContentSchema.parse(response);
    await sessionStorage.setItem(
      "pageContexts",
      JSON.stringify([currentPageContext]),
    );
    return router?.navigate("/chats");
  }

  $effect(() => {
    if (!open) {
      mode = "context";
    }
  });
</script>

<ContextMenu.Root bind:open>
  <ContextMenu.Trigger class="w-full flex">
    {@render children()}
  </ContextMenu.Trigger>
  <ContextMenu.Portal>
    <ContextMenu.Content collisionPadding={{ bottom: 64 }} class="z-1000">
      <div class="flex flex-col bg-base-300 rounded-box w-42">
        {#if mode === "context"}
          <ul class="flex flex-row p-1">
            <li>
              <button
                onclick={handleNewTab}
                class="btn btn-square btn-ghost btn-sm"
              >
                <PlusIcon size={16} />
              </button>
            </li>
            <li>
              <button
                onclick={handleCopyUrl}
                class="btn btn-square btn-ghost btn-sm"
              >
                <CopyIcon size={16} />
              </button>
            </li>
            {#if !chromiumWebsite}
              <li>
                <button
                  onclick={handleShare}
                  class="btn btn-square btn-ghost btn-sm"
                >
                  <ShareIcon size={16} />
                </button>
              </li>
            {/if}
            <li>
              <button
                onclick={handleAddToEssentials}
                class="btn btn-square btn-ghost btn-sm"
              >
                <StarIcon size={16} />
              </button>
            </li>
            <li>
              <button
                onclick={handleClose}
                class="btn btn-square btn-ghost btn-sm"
              >
                <XIcon size={16} />
              </button>
            </li>
          </ul>
          <div class="divider m-0 p-0 h-1"></div>
          <ul class="flex flex-col p-1 w-full">
            {#if !chromiumWebsite}
              <li>
                <button
                  onclick={attachTabToChat}
                  class="btn btn-ghost btn-sm justify-start gap-2 w-full"
                >
                  <PaperclipIcon size={16} />
                  <span>Attach Context</span>
                </button>
              </li>
            {/if}
            <li>
              <button
                onclick={handleReload}
                class="btn btn-ghost btn-sm justify-start gap-2 w-full"
              >
                <RefreshCwIcon size={16} />
                <span>Reload</span>
              </button>
            </li>
            <li>
              <button
                onclick={handleDuplicate}
                class="btn btn-ghost btn-sm justify-start gap-2 w-full"
              >
                <CopyPlusIcon size={16} />
                <span>Duplicate</span>
              </button>
            </li>
            <li>
              <button
                onclick={handleMute}
                class="btn btn-ghost btn-sm justify-start gap-2 w-full"
              >
                {#if tab.mutedInfo?.muted}
                  <Volume2Icon size={16} />
                  <span>Unmute</span>
                {:else}
                  <VolumeOffIcon size={16} />
                  <span>Mute</span>
                {/if}
              </button>
            </li>
            <li>
              <button
                onclick={handleCloseOtherTabs}
                class="btn btn-ghost btn-sm justify-start gap-2 w-full"
              >
                <ListXIcon size={16} />
                <span>Close Other Tabs</span>
              </button>
            </li>
            {#if filteredGroups.length > 0}
              <li>
                <button
                  onclick={handleSendToSpace}
                  class="btn btn-ghost btn-sm justify-start gap-2 w-full"
                >
                  <ListStartIcon size={16} />
                  <span>Send to Space</span>
                </button>
              </li>
            {/if}
          </ul>
        {:else}
          <ul class="flex flex-col p-1 w-full">
            <li>
              <h2 class="text-xs font-semibold ml-1 mb-2">Select Space</h2>
            </li>
            {#each filteredGroups as group}
              <li class="w-full">
                <button
                  onclick={() => sendTabToSpace(group.id)}
                  class="btn btn-ghost btn-sm justify-start gap-2 w-full"
                >
                  <ChevronRightIcon size={16} />
                  <span class="truncate">{group.title}</span>
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    </ContextMenu.Content>
  </ContextMenu.Portal>
</ContextMenu.Root>
