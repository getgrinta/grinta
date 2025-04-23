<script lang="ts">
  import { commandsStore } from "$lib/store/commands.svelte";
  import { widgetsStore } from "$lib/store/widgets.svelte";
  import { clickListener, handleContextMenu } from "$lib/utils.svelte";
  import clsx from "clsx";
  import WidgetsContextMenu from "./widgets-context-menu.svelte";
  import CommandListIcon from "./command-list-icon.svelte";
  import { settingsStore } from "$lib/store/settings.svelte";
  import { PressedKeys } from "runed";

  const pressedKeys = new PressedKeys();
  const isCtrlPressed = $derived(pressedKeys.has("Control"));

  let widgetsContextMenu = $state<WidgetsContextMenu>();
  const widgets = $derived(widgetsStore.data.widgets ?? []);
  const widgetsOpacity = $derived(1 - commandsStore.scrollTop / 20);
  const widgetsScale = $derived(1 - commandsStore.scrollTop / 1000);
  const showWidgets = $derived(widgetsStore.showWidgets && widgetsOpacity > 0);
  $effect(clickListener);

  function getShortcut(index: number) {
    if (index > 8) return;
    return `⌃${index + 1}`;
  }

  export function handleWidgetShortcut(index: number) {
    const widget = widgets[index];

    if (!widget) {
      return;
    }

    commandsStore.handleCommand({
      command: widget.data,
      recordingEnabled: false,
    });
  }
</script>

<WidgetsContextMenu bind:this={widgetsContextMenu} />

{#if showWidgets}
  <div
    class="absolute left-0 right-0 top-16 carousel z-10"
    style="opacity: {widgetsOpacity};transform: scale({widgetsScale});"
  >
    {#each widgets as widget, i}
      {@const first = i === 0}
      {@const last = i === widgets.length - 1}
      {@const shortcut = getShortcut(i)}
      <div
        class="carousel-item select-none px-1 pb-2"
        data-widget-index={i}
        role="cell"
        tabindex={0}
        oncontextmenu={(event) => {
          widgetsContextMenu?.createContextMenuItems(i);
          handleContextMenu({ event, name: "widgets" });
        }}
      >
        <button
          type="button"
          class={clsx("btn !shadow-none", first && "ml-4", last && "mr-4")}
          onclick={() =>
            commandsStore.handleCommand({
              command: widget.data,
              recordingEnabled: false,
            })}
        >
          {#if isCtrlPressed && shortcut}
            <div class="flex items-center justify-center w-6 h-6">
              {shortcut}
            </div>
          {:else}
            <CommandListIcon
              item={widget.data}
              label={widget.data.label}
              size={24}
            />
          {/if}
          {#if settingsStore.data.showWidgetLabels}
            <span>{widget.data.localizedLabel ?? widget.data.label}</span>
          {/if}
        </button>
      </div>
    {/each}
  </div>
{/if}
