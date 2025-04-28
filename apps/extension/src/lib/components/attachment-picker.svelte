<script lang="ts">
  import { DropdownMenu } from "bits-ui";
  import { tabsStore } from "$lib/store/tabs.svelte";
  import {
    FilePlusIcon,
    FileSearchIcon,
    PlusIcon,
    ServerIcon,
  } from "lucide-svelte";

  type Props = DropdownMenu.RootProps & {
    fetchTab: (tabId: number) => Promise<void>;
  };

  let { open = $bindable(false), fetchTab }: Props = $props();

  let mode = $state<"menu" | "tabSelector">("menu");

  function setMode(newMode: "menu" | "tabSelector") {
    mode = newMode;
  }

  async function fetchCurrentTab() {
    const currentTab = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    const id = currentTab[0]?.id;
    if (!id) return;
    fetchTab(id);
  }

  $effect(() => {
    if (open) return;
    setMode("menu");
  });
</script>

<DropdownMenu.Root bind:open>
  <DropdownMenu.Trigger>
    <div class="tooltip tooltip-left" data-tip="Attach context">
      <button class="btn btn-sm btn-ghost btn-square">
        <PlusIcon size={16} />
      </button>
    </div>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content side="top" align="end">
    <ul
      tabindex="0"
      class="menu menu-sm rounded-box bg-base-200 max-w-48 w-full"
    >
      {#if mode === "menu"}
        <li>
          <button onclick={fetchCurrentTab}>
            <span><FilePlusIcon size={16} /></span>Attach current tab</button
          >
        </li>
        <li>
          <a onclick={() => setMode("tabSelector")}>
            <FileSearchIcon size={16} />
            <span>Attach selected tab</span></a
          >
        </li>
        <li>
          <a>
            <ServerIcon size={16} />
            <span>Add MCP Server</span></a
          >
        </li>
      {:else}
        {#each tabsStore.tabs as tab}
          <li>
            <button onclick={() => fetchTab(tab.id ?? -1)}>
              <FilePlusIcon size={16} /><span class="truncate"
                >Attach {tab.title}</span
              ></button
            >
          </li>
        {/each}
      {/if}
    </ul>
  </DropdownMenu.Content>
</DropdownMenu.Root>
