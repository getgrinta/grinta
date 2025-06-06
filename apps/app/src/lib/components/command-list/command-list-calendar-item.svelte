<script lang="ts">
  import { clsx } from "clsx";
  import { commandsStore } from "$lib/store/commands.svelte";
  import { highlightText } from "$lib/utils.svelte";
  import { appStore } from "$lib/store/app.svelte";
  import DOMPurify from "dompurify";
  import CommandListIcon from "./command-list-icon.svelte";
  import { handleContextMenu } from "$lib/utils.svelte";
  import { _ } from "svelte-i18n";
  import { ExecutableCommandSchema } from "@getgrinta/core";
  import CommandListContextMenu from "./command-list-context-menu.svelte";
  import { z } from "zod/v3";
  import { Clock, MapPin, Users } from "lucide-svelte";
  import { formatRelative, parseISO } from "date-fns";
  import { enUS, de, pl } from "date-fns/locale";
  import { locale } from "svelte-i18n";
  import { get } from "svelte/store";
  import { calendarStore } from "$lib/store/calendar.svelte";
  import { openUrl } from "@tauri-apps/plugin-opener";

  const { item, index, active, contextMenu } = $props<{
    item: z.infer<typeof ExecutableCommandSchema>;
    index: number;
    active: boolean;
    contextMenu: CommandListContextMenu | undefined;
  }>();

  const currentLabel = $derived(item.localizedLabel ?? item.label);
  const highlightedText = $derived(highlightText(currentLabel, appStore.query));

  function formatTime(isoString: string | undefined): string {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      });
    } catch (e) {
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

  const dateFnsLocales = {
    en: enUS,
    de: de,
    pl: pl,
  };

  function getRelativeDayString(
    startDateString: string | undefined,
  ): string | null {
    if (!startDateString) return null;

    try {
      const startDate = parseISO(startDateString);
      const now = new Date();
      const currentAppLocale = get(locale) || "en";
      const selectedDateFnsLocale =
        dateFnsLocales[currentAppLocale as keyof typeof dateFnsLocales] || enUS;

      return formatRelative(startDate, now, {
        locale: selectedDateFnsLocale,
      }).replace(/^\w/, (c) => c.toUpperCase());
    } catch (e) {
      console.error("Error formatting relative date:", e);
      return null;
    }
  }

  let relativeDate = $derived(
    getRelativeDayString(item.metadata?.calendarSchema?.startTime),
  );

  // Find the calendar name from the store using the identifier
  let calendarNameForTooltip = $derived(
    calendarStore.availableCalendars.find(
      (cal) =>
        cal.identifier === item.metadata?.calendarSchema?.calendarIdentifier,
    )?.title ?? "",
  );
</script>

<li
  class="!w-[calc(100%-2rem)] mx-4 select-none"
  data-command-index={index}
  oncontextmenu={(event) => {
    contextMenu?.createContextMenuItems(item, false);
    handleContextMenu({ event, name: "commandList" });
  }}
>
  <div
    role="menuitem"
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
      <div class="flex flex-col align-left flex-1 min-w-0 max-w-[600px]">
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
        <div class="flex flex-col gap-1 text-xs opacity-80">
          {#if startTime || endTime}
            <div class="flex items-center gap-1.5">
              <Clock size={12} class="flex-shrink-0" />
              {#if item.metadata?.calendarSchema.isAllDay}
                <span class="truncate">{$_("settings.calendar.allDay")}</span>
              {/if}
              {#if relativeDate}
                <span class="truncate">{relativeDate}</span>
              {:else if startTime || endTime}
                <span class="truncate">
                  {startTime}{startTime && endTime ? " - " : ""}{endTime}
                </span>
              {/if}
            </div>
          {/if}
          {#if location || item.metadata.calendarSchema?.participants?.length > 0}
            <div class="flex items-center gap-1.5 text-xs">
              {#if location}
                <div class="flex items-center gap-1">
                  <MapPin size={12} class="flex-shrink-0" />
                  <span class="truncate">{DOMPurify.sanitize(location)}</span>
                </div>
              {/if}
              {#if item.metadata.calendarSchema?.participants?.length > 0}
                <div class="flex items-center gap-1">
                  <Users size={12} class="flex-shrink-0" />
                  <span class="truncate"
                    >{item.metadata.calendarSchema?.participants?.length}</span
                  >
                </div>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    </button>
    <div class="flex gap-1 items-center pr-2">
      {#if item.metadata?.calendarSchema?.meeting?.link}
        <button
          class="btn btn-sm btn-primary mr-2"
          onclick={async () => {
            await openUrl(item.metadata.calendarSchema.meeting.link);
          }}
        >
          {$_("common.join")}
        </button>
      {:else}
        <span
          class="tooltip block h-4 w-4 rounded-sm flex-shrink-0 mr-6"
          data-tip={calendarNameForTooltip}
          style="background-color: {bgColor};"
        ></span>
      {/if}
    </div>
  </div>
</li>
