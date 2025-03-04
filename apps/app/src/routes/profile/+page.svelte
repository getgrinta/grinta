<script lang="ts">
import { authClient } from "$lib/auth";
import TopBar from "$lib/components/top-bar.svelte";
import { onMount } from "svelte";

onMount(() => {
	console.log(authClient.getSession());
});
</script>

<div class="flex flex-1 flex-col">
    <TopBar />
    <h2>Profile</h2>
</div>