<script lang="ts">
  import { page } from "$app/state";
  import AccessoryView from "$lib/components/accessory-view/accessory-view.svelte";
  import CommandList from "$lib/components/command-list/command-list.svelte";
  import SearchBar from "$lib/components/search-bar.svelte";
  import Widgets from "$lib/components/widgets.svelte";
  import { accessoryStore } from "$lib/store/accessory.svelte";
  import { appStore } from "$lib/store/app.svelte";
  import { commandsStore } from "$lib/store/commands.svelte";
  import { widgetsStore } from "$lib/store/widgets.svelte";
  import { _ } from "svelte-i18n";
  function handleWidgetShortcut(widgetNumber: number) {
    widgetBar.handleWidgetShortcut(widgetNumber - 1);
  }

  let widgetBar: Widgets;
  $effect(() => {
    appStore.switchMode(page.params.mode);
    commandsStore.scrollTop = 0;

    accessoryStore.setMode({
      type: "map",
      options: {
        latitude: 1.364917,
        longitude: 103.822872,
      },
    });
  });
</script>

<div class="flex flex-1 flex-col gap-1">
  <SearchBar onWidgetShortcut={handleWidgetShortcut} />

  <div class="flex flex-col relative">
    {#if !accessoryStore.mode}
      <Widgets bind:this={widgetBar} />
    {/if}

    {#if accessoryStore.mode}
      <AccessoryView
        class="absolute top-13 left-0 right-0 z-50"
        mode={accessoryStore.mode}
      />
    {/if}
    - add consume method to accessoryStore - when a coordinate is passed in form
    of lat,lon - set the mode to map - when the search query doesn't match any accessory
    modes - clear the mode - the consume method should be triggered in search bar
    <CommandList
      paddingTop={accessoryStore.mode
        ? 192
        : widgetsStore.showWidgets
          ? 116
          : 72}
    />
  </div>
</div>
