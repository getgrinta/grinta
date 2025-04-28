<script lang="ts">
  import { appStore } from "$lib/store/app.svelte";
  import {
    CircleDashedIcon,
    CircleDotDashedIcon,
    CogIcon,
  } from "lucide-svelte";
  import { useRsv } from "@ryuz/rsv";
  import { tabsStore } from "$lib/store/tabs.svelte";
  import { sendMessage } from "webext-bridge/popup";

  const router = useRsv();

  async function activateSpace(spaceId: number) {
    appStore.setCurrentSpaceId(spaceId);
    await sendMessage(
      "grinta_activateGroup",
      { groupId: spaceId },
      "background",
    );
  }
</script>

<div class="flex items-center justify-between">
  <div class="flex items-center">
    {#each tabsStore.groups as space}
      <div class="tooltip tooltip-bottom" data-tip={space.title}>
        <button
          class="btn btn-sm btn-ghost btn-square"
          onclick={() => activateSpace(space.id)}
        >
          {#if space.id === appStore.data.currentSpaceId}
            <CircleDotDashedIcon size={20} />
          {:else}
            <CircleDashedIcon size={20} />
          {/if}
        </button>
      </div>
    {/each}
  </div>
  <button
    class="btn btn-sm btn-ghost btn-square"
    onclick={() => router?.navigate("/settings")}
  >
    <CogIcon size={20} />
  </button>
</div>
