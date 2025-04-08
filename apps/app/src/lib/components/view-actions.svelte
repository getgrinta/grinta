<script lang="ts">
import clsx from "clsx";
import { PressedKeys } from "runed";

type Action = {
	label: string;
	onclick: () => void;
	shortcut?: string;
};

const { actions, size } = $props<{ actions: Action[], size?: "sm" | "md" }>();

const pressedKeys = new PressedKeys();
const isCmdPressed = $derived(pressedKeys.has("Meta"));
</script>

<div class="flex pointer-events-auto">
	{#each actions as action}
		<button
			type="button"
			class={clsx("btn", size === "sm" && "btn-sm")}
			onclick={action.onclick}
		>
			<span>{action.label}</span>
			{#if action.shortcut && isCmdPressed}
				<span class="text-sm">{action.shortcut}</span>
			{/if}
		</button>
	{/each}
</div>