<script lang="ts">
  import { clsx } from "clsx";
  import { commandsStore } from "$lib/store/commands.svelte";
  import { highlightText } from "$lib/utils.svelte";
  import { appStore } from "$lib/store/app.svelte";
  import DOMPurify from "dompurify";
  import CommandListIcon from "./command-list-icon.svelte";

  const { item, index, active } = $props();

  const currentLabel = $derived(item.localizedLabel ?? item.label);

  const highlightedText = $derived(highlightText(currentLabel, appStore.query));

  // Format time - adjust format string as needed
  function formatTime(isoString: string | undefined): string {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      });
    } catch (e) {
      console.error("Error parsing date:", isoString, e);
      return "Invalid Date";
    }
  }

  const startTime = $derived(
    formatTime(item.metadata?.calendarSchema?.startTime),
  );
  const endTime = $derived(formatTime(item.metadata?.calendarSchema?.endTime));
  const location = $derived(item.metadata?.calendarSchema?.location);
  const bgColor = $derived(
    item.metadata?.calendarSchema?.backgroundColor ?? "#808080",
  );
</script>

<li class="!w-[calc(100%-2rem)] mx-4 select-none" data-command-index={index}>
  <div
    class={clsx(
      "flex justify-between gap-4 border border-transparent hover:bg-primary/40 !shadow-none",
      active &&
        "menu-active !bg-primary/50 text-primary-content !border-primary-content/20",
    )}
  >
    <button
      type="button"
      onclick={() => commandsStore.handleCommand({ command: item })}
      data-testid={`command-list-item.${index}`}
      class="flex flex-1 h-full gap-4 py-[0.5rem] items-center cursor-pointer"
    >
      <CommandListIcon label={currentLabel} {item} {active} />
      <div class="flex flex-col align-left flex-1 min-w-0">
        <h2 class="flex-1 flex text-left font-semibold truncate max-w-full">
          {#each highlightedText as chunk}
            {@const last =
              chunk === highlightedText[highlightedText.length - 1]}
            {@const sanitizedText = DOMPurify.sanitize(
              chunk.text.replace(/\s+/g, " "),
            )}
            <span
              class={clsx(
                "whitespace-pre",
                chunk.highlight ? "text-base-content" : "text-primary-content",
                last && "truncate",
                active && "!text-primary-content",
              )}
            >
              {@html sanitizedText}
            </span>
          {/each}
        </h2>
        <div class="text-xs opacity-80 flex items-center gap-2 truncate">
          {#if item.metadata?.calendarSchema?.isAllDay === false && (startTime || endTime)}
            <span class="flex-shrink-0">
              {startTime}{startTime && endTime ? " - " : ""}{endTime}
            </span>
          {/if}
          {#if location}
            <span class="truncate">• {location}</span>
          {/if}
        </div>
      </div>
    </button>
    <div class="flex gap-1 items-center pr-2">
      <span
        class="block h-4 w-4 rounded-sm flex-shrink-0"
        style="background-color: {bgColor};"
      ></span>
    </div>
  </div>
</li>
