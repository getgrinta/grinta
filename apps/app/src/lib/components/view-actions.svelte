<script lang="ts">
import { PressedKeys } from "runed";

type Action = {
	label: string;
	onclick: () => void;
	shortcut?: string;
};

const { actions } = $props<{ actions: Action[] }>();

const pressedKeys = new PressedKeys();
const isCmdPressed = $derived(pressedKeys.has("Meta"));
</script>

<div class="flex pointer-events-auto">
	{#each actions as action}
		<button
			type="button"
			class="btn"
			onclick={action.onclick}
		>
			<span>{action.label}</span>
			{#if action.shortcut && isCmdPressed}
				<span class="text-sm">{action.shortcut}</span>
			{/if}
		</button>
	{/each}
</div>