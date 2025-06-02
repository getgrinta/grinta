<script lang="ts">
  import { useRsv } from "@ryuz/rsv";
  import clsx from "clsx";
  import { ListIcon, SettingsIcon, SparklesIcon } from "lucide-svelte";
  import type { Snippet } from "svelte";
  import { sendMessage } from "webext-bridge/popup";

  const { children } = $props<{ children: Snippet }>();
  const router = useRsv();

  function requestStateUpdate() {
    return sendMessage("grinta_updateState", {}, "background");
  }

  async function openTabs() {
    if (!router) return;
    await requestStateUpdate();
    router.navigate("/");
  }

  async function openAgent() {
    if (!router) return;
    await requestStateUpdate();
    router.navigate("/chats");
  }
</script>

{#if router}
  <div class="flex flex-col min-h-screen">
    <div class="flex-1 flex flex-col pb-16">
      {@render children()}
    </div>
    <div class="dock dock-sm">
      <button
        class={clsx({ "dock-active": router.path === "/" })}
        onclick={openTabs}
        aria-label="View Tabs"
      >
        <ListIcon size={20} />
      </button>
      <button
        class={clsx({ "dock-active": router.path?.includes("/chats") })}
        onclick={openAgent}
        aria-label="Open Agent"
      >
        <SparklesIcon size={20} />
      </button>
      <button
        class={clsx({ "dock-active": router.path?.includes("/settings") })}
        onclick={() => router?.navigate("/settings")}
        aria-label="Open Settings"
      >
        <SettingsIcon size={20} />
      </button>
    </div>
  </div>
{/if}
