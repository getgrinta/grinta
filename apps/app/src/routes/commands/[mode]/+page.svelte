<script lang="ts">
  import { page } from "$app/state";
  import AccessoryView from "$lib/components/accessory-view/accessory-view.svelte";
  import CommandList from "$lib/components/command-list/command-list.svelte";
  import SearchBar from "$lib/components/search-bar.svelte";
  import Widgets from "$lib/components/widgets.svelte";
  import { accessoryStore } from "$lib/store/accessory.svelte";
  import { appStore } from "$lib/store/app.svelte";
  import { commandsStore } from "$lib/store/commands.svelte";
  import { notesStore } from "$lib/store/notes.svelte";
  import { widgetsStore } from "$lib/store/widgets.svelte";
  import { APP_MODE } from "@getgrinta/core";
  import { onMount } from "svelte";
  import { _ } from "svelte-i18n";
  function handleWidgetShortcut(widgetNumber: number) {
    widgetBar?.handleWidgetShortcut(widgetNumber - 1);
  }

  let widgetBar = $state<Widgets>();
  $effect(() => {
    appStore.switchMode(page.params.mode);
    commandsStore.scrollTop = 0;
  });

  $effect(() => {
    if (appStore.appMode === APP_MODE.NOTES) {
      notesStore.fetchNotes().then(() => {
        commandsStore.buildCommands({ isRefresh: true });
      });
    }
  });
</script>

<div class="flex flex-1 flex-col">
  <SearchBar onWidgetShortcut={handleWidgetShortcut} />
  <div class="flex flex-col relative">
    {#if !accessoryStore.mode}
      <Widgets bind:this={widgetBar} />
    {/if}
    {#if accessoryStore.mode}
      <AccessoryView
        class="absolute top-13 left-0 right-0 z-1"
        mode={accessoryStore.mode}
        isCopyable={accessoryStore.isCopyable}
        isRefreshable={accessoryStore.isRefreshable}
      />
    {/if}
    <CommandList
      paddingTop={accessoryStore.mode
        ? 192
        : widgetsStore.showWidgets
          ? 116
          : 72}
    />
  </div>
</div>
