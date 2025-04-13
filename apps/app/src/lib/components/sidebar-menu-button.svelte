<script lang="ts">
  import { appStore } from "$lib/store/app.svelte";
  import { PressedKeys } from "runed";
  import { MenuIcon } from "lucide-svelte";
  import { _ } from "svelte-i18n";

  const pressedKeys = new PressedKeys();
  const isCmdPressed = $derived(pressedKeys.has("Meta"));
  const userId = $derived(appStore.user?.id);
</script>

<label class="btn btn-square btn-sm relative" for="menuSidebar">
  {#if isCmdPressed}
    <div
      class="absolute inset-0 flex items-center justify-center rounded-full bg-black/25"
    >
      <span class="text-white">⌘K</span>
    </div>
  {/if}
  {#if userId}
    <img
      src={`https://meshy.studio/api/mesh/${userId}?noise=8&sharpen=1&negate=false&gammaIn=2.1&gammaOut=2.2&brightness=100&saturation=100&hue=0&lightness=0&blur=0`}
      alt="Avatar"
      class="rounded-full"
    />
  {:else}
    <MenuIcon size={20} />
  {/if}
</label>
