<script lang="ts">
	import { goto } from "$app/navigation";
	import { BAR_MODE } from "$lib/store/app.svelte";
  import { settingsStore } from "$lib/store/settings.svelte";
	import { onMount } from "svelte";

	onMount(() => {
		if (!settingsStore.data.onboardingCompleted) {
			return goto('/onboarding')
		}
		return goto(`/commands/${BAR_MODE.INITIAL}`);
	});
</script>
