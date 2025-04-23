<script lang="ts">
  import { commandsStore } from "$lib/store/commands.svelte";
  import { clickListener } from "$lib/utils.svelte";
  import { _ } from "svelte-i18n";
  import { VList } from "virtua/svelte";
  import CommandListContextMenu from "./command-list-context-menu.svelte";
  import CommandListItem from "./command-list-item.svelte";
  import CommandListCalendarItem from "./command-list-calendar-item.svelte";
  import { COMMAND_HANDLER } from "@getgrinta/core";
  import { settingsStore } from "$lib/store/settings.svelte";
  import { watch } from "runed";

  let contextMenu = $state<CommandListContextMenu>();
  let virtualizer = $state<VList<any>>();

  function handleListScroll(offset: number) {
    commandsStore.scrollTop = offset;
  }

  $effect(() => {
    const selectedIndex = commandsStore.selectedIndex;
    if (selectedIndex === 0) {
      virtualizer?.scrollToIndex(0, { align: "start" });
    } else {
      virtualizer?.scrollToIndex(selectedIndex, { align: "nearest" });
    }
  });

  // Watch for calendar changes
  watch(
    () => [
      settingsStore.data.ignoredEventIds,
      settingsStore.data.selectedCalendarIdentifiers,
    ],
    () => {
      commandsStore.buildCommands({ isRefresh: true });
    },
  );

  // Hide context menu when clicking outside
  $effect(clickListener);
</script>

<CommandListContextMenu bind:this={contextMenu} />

<ul
  id="commandList"
  class="menu menu-lg flex-1 menu-vertical flex-nowrap overflow-hidden w-full p-0"
>
  <VList
    bind:this={virtualizer}
    data={commandsStore.commands}
    style="height: 99vh;padding-top: var(--commands-padding);padding-bottom:1rem;"
    getKey={(_, i) => i}
    onscroll={handleListScroll}
  >
    {#snippet children(item, index)}
      {@const active = commandsStore.selectedIndex === index}
      {#if item.handler === COMMAND_HANDLER.OPEN_CALENDAR}
        <CommandListCalendarItem {item} {index} {active} {contextMenu} />
      {:else}
        <CommandListItem {item} {index} {active} {contextMenu} />
      {/if}
    {/snippet}
  </VList>
</ul>
