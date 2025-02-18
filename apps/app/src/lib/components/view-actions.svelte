<script lang="ts">
let { actions } = $props();
import { PressedKeys } from "runed";

const pressedKeys = new PressedKeys();

const isCmdPressed = $derived(pressedKeys.has("Meta"));
</script>

<div class="flex fixed bottom-4 right-4">
  {#each actions as action}
  	<button type="button" class="btn" onclick={action.onclick}>
      <span>{action.label}</span>
      {#if isCmdPressed}
        <span>{action.shortcut}</span>
      {/if}
  	</button>
	{/each}
</div>
