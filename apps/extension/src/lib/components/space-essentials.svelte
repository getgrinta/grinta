<script lang="ts">
  import { slide } from "svelte/transition";
  import { sendMessage } from "webext-bridge/popup";

  let { essentials } = $props<{
    essentials: chrome.bookmarks.BookmarkTreeNode[];
  }>();

  function handleClick(essential: chrome.bookmarks.BookmarkTreeNode) {
    return sendMessage(
      "grinta_openEssential",
      { essentialId: essential.id },
      "background",
    );
  }
</script>

<div class="flex gap-2" transition:slide>
  {#each essentials as essential}
    {@const hostname = new URL(essential.url).hostname}
    <div class="tooltip tooltip-top" data-tip={essential.title}>
      <button class="btn btn-square" onclick={() => handleClick(essential)}>
        <img
          src="https://www.google.com/s2/favicons?domain={hostname}"
          class="w-6 h-6 rounded-full"
        />
      </button>
    </div>
  {/each}
</div>
