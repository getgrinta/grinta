<script lang="ts">
import { page } from "$app/stores";
import CommandList from "$lib/components/command-list.svelte";
import SearchBar from "$lib/components/search-bar.svelte";
import { appStore } from "$lib/store/app.svelte";
import { onMount } from "svelte";

$effect(() => {
	appStore.switchMode($page.params.mode);
});
</script>

<div class="flex flex-1 flex-col gap-1">
  <SearchBar />
  <CommandList />
</div>
