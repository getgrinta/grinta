<script lang="ts">
import { goto } from "$app/navigation";
import { BAR_MODE } from "$lib/store/app.svelte";
import { onMount } from "svelte";

onMount(() => {
	goto(`/commands/${BAR_MODE.INITIAL}`);
});
</script>
