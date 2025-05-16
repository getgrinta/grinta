<script lang="ts">
  import { authClient } from "$lib/auth";
  import { useRsv } from "@ryuz/rsv";
  import clsx from "clsx";
  import { ListIcon, SparklesIcon, UserIcon } from "lucide-svelte";
  import type { Snippet } from "svelte";
  import { sendMessage } from "webext-bridge/popup";

  const { children } = $props<{ children: Snippet }>();
  const router = useRsv();
  const session = authClient.useSession();
  const user = $derived($session.data?.user);

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
        class={clsx({
          "dock-active": ["/profile", "/sign-in"].includes(router.path ?? ""),
        })}
        onclick={() => router.navigate(user ? "/profile" : "/sign-in")}
      >
        {#if user}
          <img
            src={`https://meshy.studio/api/mesh/${user.id}?noise=8&sharpen=1&negate=false&gammaIn=2.1&gammaOut=2.2&brightness=100&saturation=100&hue=0&lightness=0&blur=0`}
            alt="Avatar"
            class="w-6 rounded-full"
          />
        {:else}
          <UserIcon size={20} />
        {/if}
      </button>
    </div>
  </div>
{/if}
