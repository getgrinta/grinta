<script lang="ts">
  import { commandsStore } from "$lib/store/commands.svelte";
  import { clickListener } from "$lib/utils.svelte";
  import { _ } from "svelte-i18n";
  import { VList } from "virtua/svelte";
  import CommandListContextMenu from "./command-list-context-menu.svelte";
  import CommandListItem from "./command-list-item.svelte";

  let contextMenu = $state<CommandListContextMenu>();
  let virtualizer = $state<VList<any>>();

  function handleListScroll(offset: number) {
    commandsStore.scrollTop = offset;
  }

  $effect(() => {
    const selectedIndex = commandsStore.selectedIndex;

    if (selectedIndex >= 0) {
      virtualizer?.scrollToIndex(selectedIndex, { align: "start" });
    }
  });

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
      <CommandListItem {item} {index} {active} {contextMenu} />
    {/snippet}
  </VList>
</ul>
