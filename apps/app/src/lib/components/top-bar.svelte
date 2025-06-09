<script lang="ts">
  import { ChevronLeftIcon } from "lucide-svelte";
  import type { Snippet } from "svelte";

  const { goBack, indicator, input, addon } = $props<{
    goBack?: () => void;
    indicator?: Snippet;
    input?: Snippet;
    addon?: Snippet;
  }>();

  function defaultGoBack() {
    return window.history.back();
  }
</script>

<div class="fixed flex flex-row left-0 top-0 right-0 z-20 items-center">
  <label
    for="nothing"
    class="input px-6 h-14 !outline-none bg-transparent border-none !shadow-none rounded-none flex-1 flex items-center gap-4 w-full"
  >
    {#if indicator}
      {@render indicator?.()}
    {:else}
      <button
        type="button"
        class="btn btn-sm btn-square border-gradient"
        onclick={goBack ?? defaultGoBack}
      >
        <ChevronLeftIcon size={16} />
      </button>
    {/if}
    {@render input?.()}
    {@render addon?.()}
  </label>
</div>
