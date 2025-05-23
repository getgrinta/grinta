<script lang="ts">
  import type { Snippet } from "svelte";
  import { ContextMenu } from "bits-ui";
  import {
    CopyPlusIcon,
    ListXIcon,
    PlusIcon,
    RefreshCwIcon,
    StarIcon,
    Volume2Icon,
    VolumeOffIcon,
    XIcon,
  } from "lucide-svelte";
  import { sendMessage } from "webext-bridge/popup";

  type Props = ContextMenu.RootProps & {
    children: Snippet;
    tab: chrome.tabs.Tab;
  };

  let { open = $bindable(false), tab, children }: Props = $props();

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
</script>

<ContextMenu.Root bind:open>
  <ContextMenu.Trigger class="w-full flex">
    {@render children()}
  </ContextMenu.Trigger>
  <ContextMenu.Portal>
    <ContextMenu.Content>
      <ul class="menu menu-sm bg-base-300 rounded-box w-56">
        <li>
          <a onclick={handleNewTab}>
            <PlusIcon size={16} />
            <span>New Tab Below</span>
          </a>
        </li>
        <li>
          <a onclick={handleReload}>
            <RefreshCwIcon size={16} />
            <span>Reload</span></a
          >
        </li>
        <li>
          <a onclick={handleDuplicate}>
            <CopyPlusIcon size={16} />
            <span>Duplicate</span>
          </a>
        </li>
        <li>
          <a onclick={handleMute}>
            {#if tab.mutedInfo?.muted}
              <Volume2Icon size={16} />
              <span>Unmute</span>
            {:else}
              <VolumeOffIcon size={16} />
              <span>Mute</span>
            {/if}
          </a>
        </li>
        <li>
          <a onclick={handleClose}>
            <XIcon size={16} />
            <span>Close Tab</span>
          </a>
        </li>
        <li>
          <a onclick={handleCloseOtherTabs}>
            <ListXIcon size={16} />
            <span>Close Other Tabs</span>
          </a>
        </li>
        <li>
          <a onclick={handleAddToEssentials}>
            <StarIcon size={16} />
            <span>Add to Essential</span>
          </a>
        </li>
      </ul>
    </ContextMenu.Content>
  </ContextMenu.Portal>
</ContextMenu.Root>
