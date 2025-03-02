<script lang="ts">
let { actions } = $props();
import { PressedKeys } from "runed";

const pressedKeys = new PressedKeys();

const _isCmdPressed = $derived(pressedKeys.has("Meta"));
</script>

{#each actions as action}
  <button type="button" class="btn" onclick={action.onclick}>
    <span>{action.label}</span>
    {#if isCmdPressed}
      <span>{action.shortcut}</span>
    {/if}
  </button>
{/each}
