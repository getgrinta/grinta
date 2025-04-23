<script lang="ts">
  import { page } from "$app/state";
  import CommandList from "$lib/components/command-list.svelte";
  import SearchBar from "$lib/components/search-bar.svelte";
  import Widgets from "$lib/components/widgets.svelte";
  import { appStore } from "$lib/store/app.svelte";
  import { commandsStore } from "$lib/store/commands.svelte";
  import { _ } from "svelte-i18n";

  function handleWidgetShortcut(widgetNumber: number) {
    widgetBar.handleWidgetShortcut(widgetNumber - 1);
  }

  let widgetBar: Widgets;
  $effect(() => {
    appStore.switchMode(page.params.mode);
    commandsStore.scrollTop = 0;
  });
</script>

<div class="flex flex-1 flex-col gap-1">
  <SearchBar onWidgetShortcut={handleWidgetShortcut} />
  <div class="flex flex-col relative">
    <Widgets bind:this={widgetBar} />
    <CommandList />
  </div>
</div>
