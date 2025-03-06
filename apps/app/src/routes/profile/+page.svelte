<script lang="ts">
import { getAuthClient } from "$lib/auth";
import TopBar from "$lib/components/top-bar.svelte";
import { vaultStore } from "$lib/store/vault.svelte";
import { onMount } from "svelte";

onMount(() => {
	const authClient = getAuthClient();
	console.log(authClient.getSession());
	console.log(vaultStore.vault?.authCookie);
});
</script>

<div class="flex flex-1 flex-col">
    <TopBar />
    <h2>Profile</h2>
</div>