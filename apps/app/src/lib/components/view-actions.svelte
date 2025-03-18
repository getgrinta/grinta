<script lang="ts">
	import { PressedKeys } from "runed";
	import FlatButton from "./flat-button.svelte";

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
		<FlatButton
			text={action.label}
			onClick={action.onclick}
			showShortcut={isCmdPressed}
			shortcut={action.shortcut}
		/>
	{/each}
</div>