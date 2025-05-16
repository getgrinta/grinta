<script lang="ts">
  import { Popover } from "bits-ui";
  import { FilePlusIcon, FileSearchIcon, ServerIcon } from "lucide-svelte";
  import type { Snippet } from "svelte";

  type Props = Popover.RootProps & {
    tabs: chrome.tabs.Tab[];
    fetchTab: (tabId: number) => Promise<void>;
    children: Snippet;
    menuWidth: number;
  };

  let {
    open = $bindable(false),
    tabs,
    fetchTab,
    children,
    menuWidth,
  }: Props = $props();

  let mode = $state<"menu" | "tabSelector">("menu");

  function setMode(newMode: "menu" | "tabSelector") {
    mode = newMode;
  }

  $effect(() => {
    if (open) return;
    setMode("menu");
  });
</script>

<Popover.Root bind:open>
  <Popover.Trigger class="w-full">
    {@render children()}
  </Popover.Trigger>
  <Popover.Content side="top" align="center">
    <ul
      tabindex={0}
      class="menu menu-sm rounded-box bg-base-200 w-full"
      style="width:{menuWidth}px;"
    >
      {#if mode === "menu"}
        <li>
          <button type="button" onclick={() => setMode("tabSelector")}>
            <FileSearchIcon size={16} />
            <span>Attach selected tab</span></button
          >
        </li>
      {:else}
        {#each tabs as tab}
          <li>
            <button type="button" onclick={() => fetchTab(tab.id ?? -1)}>
              <FilePlusIcon size={16} /><span class="truncate"
                >Attach {tab.title}</span
              ></button
            >
          </li>
        {/each}
      {/if}
    </ul>
  </Popover.Content>
</Popover.Root>
