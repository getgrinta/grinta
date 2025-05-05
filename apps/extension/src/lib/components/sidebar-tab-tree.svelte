<script lang="ts">
  import type { TreeNodeTab } from "$lib/utils.svelte";
  import SidebarTab from "./sidebar-tab.svelte";
  import type { DragDropOptions } from "@thisux/sveltednd";

  const { treeNodeTab, draggableConfig, droppableConfig } = $props<{
    treeNodeTab: TreeNodeTab;
    draggableConfig: object;
    droppableConfig: DragDropOptions;
  }>();
</script>

<SidebarTab tab={treeNodeTab.tab} {draggableConfig} {droppableConfig} />
<div class="flex flex-col ml-4">
  {#each treeNodeTab.children as nestedTab}
    <SidebarTab tab={nestedTab.tab} {draggableConfig} {droppableConfig} />
  {/each}
</div>
