<script lang="ts">
  import SidebarTab from "./sidebar-tab.svelte";
  // For recursion
  import NestedSidebarTab from "./nested-sidebar-tab.svelte";
  export let tabNode: { tab: any; children: any[] };
  export let level: number = 0;
  export let handleDrop: (state: any) => void;
</script>

<div style="display: contents">
  <SidebarTab
    tab={tabNode.tab}
    class={`nested-tab-level-${level}`}
    draggableConfig={{
      container: tabNode.tab.id.toString(),
      dragData: tabNode.tab,
      interactive: ["[data-btn-close]", "[data-btn-activate]"],
    }}
    droppableConfig={{
      container: tabNode.tab.id.toString(),
      callbacks: { onDrop: handleDrop as never },
      attributes: {
        dragOverClass: "scale-105 border-yellow-300/50",
      },
    }}
  />

  {#if tabNode.children && tabNode.children.length}
    {#each tabNode.children as childNode (childNode.tab.id)}
      <NestedSidebarTab tabNode={childNode} level={level + 1} {handleDrop} />
    {/each}
  {/if}
</div>

<style>
  /* Dynamically generate nesting levels up to a reasonable depth */
  :global(.nested-tab-level-0) {
    margin-left: 0;
  }
  :global(.nested-tab-level-1) {
    margin-left: 8px;
  }
  :global(.nested-tab-level-2) {
    margin-left: 16px;
  }
  :global(.nested-tab-level-3) {
    margin-left: 24px;
  }
  :global(.nested-tab-level-4) {
    margin-left: 32px;
  }
  :global(.nested-tab-level-5) {
    margin-left: 40px;
  }
  /* Add more if needed */
</style>
