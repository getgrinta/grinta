<script lang="ts">
  import type { Snippet } from "svelte";

  const { title, action, addon, titleElement } = $props<{
    title: string;
    action?: Snippet;
    addon?: Snippet;
    titleElement?: Snippet;
  }>();
</script>

<div
  class="flex items-center border-b bg-base-100/50 backdrop-blur-lg border-base-content/5 p-2"
>
  {@render action?.()}
  {#if titleElement}
    {@render titleElement()}
  {:else}
    <h1 class="text-lg flex-1 font-semibold truncate ml-2">{title}</h1>
  {/if}
  <div class="flex items-center">
    {@render addon?.()}
  </div>
</div>
