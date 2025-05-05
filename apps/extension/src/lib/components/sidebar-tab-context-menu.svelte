<script lang="ts">
  import type { Snippet } from "svelte";
  import { ContextMenu } from "bits-ui";
  import {
    CopyPlusIcon,
    ListXIcon,
    PinIcon,
    PlusIcon,
    RefreshCwIcon,
    StarIcon,
    VolumeOffIcon,
    XIcon,
  } from "lucide-svelte";
  import { sendMessage } from "webext-bridge/popup";

  type Props = ContextMenu.RootProps & {
    children: Snippet;
    tabId: number;
  };

  let { open = $bindable(false), tabId, children }: Props = $props();

  function handleNewTab() {
    sendMessage("grinta_newTab", { tabId }, "background");
    open = false;
  }

  function handleReload() {
    sendMessage("grinta_reloadTab", { tabId }, "background");
    open = false;
  }

  function handleDuplicate() {
    sendMessage("grinta_duplicateTab", { tabId }, "background");
    open = false;
  }

  function handlePin() {
    sendMessage("grinta_togglePinTab", { tabId }, "background");
    open = false;
  }

  function handleMute() {
    sendMessage("grinta_toggleMuteTab", { tabId }, "background");
    open = false;
  }

  function handleClose() {
    sendMessage("grinta_closeTab", { tabId }, "background");
    open = false;
  }

  function handleCloseOtherTabs() {
    sendMessage("grinta_closeOtherTabs", { tabId }, "background");
    open = false;
  }

  function handleAddToEssentials() {
    sendMessage("grinta_addToEssentials", { tabId }, "background");
    open = false;
  }
</script>

<ContextMenu.Root bind:open>
  <ContextMenu.Trigger class="w-full flex">
    {@render children()}
  </ContextMenu.Trigger>
  <ContextMenu.Portal>
    <ContextMenu.Content>
      <ul class="menu menu-sm bg-base-200 rounded-box w-56">
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
          <a onclick={handlePin}>
            <PinIcon size={16} />
            <span>Pin</span>
          </a>
        </li>
        <li>
          <a onclick={handleMute}>
            <VolumeOffIcon size={16} />
            <span>Mute</span>
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
