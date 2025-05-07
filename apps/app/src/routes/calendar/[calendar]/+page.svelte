<script lang="ts">
  import { page } from "$app/state";
  import TopBar from "$lib/components/top-bar.svelte";
  import { calendarStore } from "$lib/store/calendar.svelte";
  import type { EventInfo } from "$lib/types/calendar";
  import { openUrl } from "@tauri-apps/plugin-opener"; // Import openUrl
  import {
    Calendar as CalendarIcon,
    Clock,
    MapPin,
    Link,
    Users,
    FileText,
    ExternalLink, // Import ExternalLink icon
  } from "lucide-svelte";
  import { format, isToday, formatDistanceToNow } from "date-fns";
  import DOMPurify from "dompurify";
  import { _ } from "svelte-i18n";
  import type { Meeting } from "@getgrinta/core";
  import { extractMeetingInfo } from "$lib/utils.svelte";

  // State to hold the specific event details
  let event = $state<EventInfo | null>(null);
  let meeting = $state<Meeting | null>(null);

  // Derived state to get the event ID from the page params
  const eventId = $derived(decodeURIComponent(page.params.calendar));

  // Effect to find the event when the eventId or commands change
  $effect(() => {
    if (!eventId) {
      event = null;
      return;
    }
    // Access events directly from calendarStore
    const allEvents = calendarStore.events;
    const foundEvent = allEvents.find((ev) => ev.identifier === eventId);

    if (foundEvent) {
      event = foundEvent;
      meeting = extractMeetingInfo(event.notes);
    } else {
      event = null; // Set to null if not found
      console.warn(
        `Calendar event with ID ${eventId} not found in calendarStore.`,
      );
    }
  });

  function formatEventTime(
    startTimeStr?: string,
    endTimeStr?: string,
    isAllDayEvent?: boolean,
  ): string {
    if (isAllDayEvent && startTimeStr && isToday(new Date(startTimeStr))) {
      return $_("settings.calendar.allDay");
    }

    // The rest of the function handles non-all-day events
    if (!startTimeStr) {
      return $_("common.notSet");
    }

    const start = new Date(startTimeStr);
    const end = endTimeStr ? new Date(endTimeStr) : null;

    const startTimeFormatted = format(start, "HH:mm");
    const endTimeFormatted = end ? format(end, "HH:mm") : null;

    const dateFormatted = format(start, "PPP"); // Format like 'Jan 1st, 2024'

    if (endTimeFormatted) {
      return `${dateFormatted}, ${startTimeFormatted} - ${endTimeFormatted}`;
    } else {
      return `${dateFormatted}, ${startTimeFormatted}`;
    }
  }

  function formatParticipants(
    participants?: { name?: string | null }[],
  ): string {
    if (!participants || participants.length === 0) {
      return $_("common.notSet");
    }
    return participants
      .map((p) => p.name || $_("calendar.unknownParticipant"))
      .join(", ");
  }

  async function openLocationInMaps(location: string | null) {
    // Allow null
    if (!location) return;
    const mapsUrl = `https://maps.google.com?q=${encodeURIComponent(location)}`;
    try {
      await openUrl(mapsUrl);
    } catch (error) {
      console.error("Failed to open URL:", error);
    }
  }

  async function openEventUrl(url: string | null) {
    if (!url) return;
    let processedUrl = url;
    if (!/^https?:\/\/|^www\./i.test(url)) {
      // Escaped slashes
      processedUrl = `https://${url}`;
    }
    try {
      await openUrl(processedUrl);
    } catch (error) {
      console.error("Failed to open URL:", error);
    }
  }

  function linkifyAndSanitize(text: string | null | undefined): string {
    if (!text) {
      return "";
    }
    const urlRegex =
      /(\b(https?|ftp):\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])|(\bwww\.[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])/gi;
    const linkedText = text
      .replace(
        "-::~:~::~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~::~:~::-\n",
        "",
      )
      .replace(
        "\n-::~:~::~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~::~:~::-",
        "",
      )
      .replace(urlRegex, (match, p1, p2, p3) => {
        const actualUrl = p1 ? p1 : `http://${p3}`;
        const linkText = p1 ? p1 : p3;

        return `<a href="#" data-link-url="${actualUrl}" target="_blank" rel="noopener noreferrer" data-internal-link="true">${linkText}</a>`;
      });

    return DOMPurify.sanitize(linkedText);
  }

  function handleNoteLinkClick(event: MouseEvent) {
    let target = event.target as HTMLElement | null;

    while (target && target !== event.currentTarget) {
      if (target.tagName === "A" && target.hasAttribute("data-internal-link")) {
        event.preventDefault(); // Prevent default navigation for href="#"
        const href = target.getAttribute("data-link-url"); // Get URL from data-attribute
        if (href) {
          openUrl(href);
        }
        return;
      }
      target = target.parentElement;
    }
  }
</script>

<div class="flex flex-col h-full">
  <TopBar>
    <div slot="input" class="flex items-center gap-2 grow h-8">
      {#if event}
        <CalendarIcon size={20} class="text-base-content/70" />
        <span class="font-semibold text-lg truncate py-1"
          >{event?.title || $_("calendar.untitledEvent")}</span
        >
      {:else}
        <!-- Keep the span for loading text, adjusted styling if needed -->
        <span class="font-semibold text-lg py-1 grow"
          >{$_("calendar.loadingEvent")}</span
        >
      {/if}
    </div>

    <div slot="addon">
      {#if meeting}
        <button
          class="btn btn-sm btn-primary mr-2"
          onclick={async () => {
            if (meeting?.link) {
              await openUrl(meeting.link);
            }
          }}
        >
          {$_("common.join")}
        </button>
      {/if}
    </div>
  </TopBar>

  <div class="mt-16 px-6 pb-8 pt-4 flex-grow overflow-y-auto">
    {#if event}
      <div class="space-y-4 text-base-content">
        <!-- Time -->
        <div class="flex items-start gap-3">
          <div class="mt-1">
            <Clock size={18} class="text-base-content/70" />
          </div>
          <div>
            <p class="font-medium">
              {formatEventTime(
                event.start_date,
                event.end_date,
                event.is_all_day,
              )}
            </p>
            {#if event.start_date}
              <p class="text-sm text-base-content/70">
                {formatDistanceToNow(new Date(event.start_date), {
                  addSuffix: true,
                })}
              </p>
            {/if}
          </div>
        </div>

        <!-- Location -->
        {#if event && event.location}
          <div class="flex items-start gap-3">
            <div class="mt-1">
              <MapPin size={18} class="text-base-content/70" />
            </div>
            <div class="flex items-center justify-between">
              <p class="font-medium">{event.location}</p>
              <button
                onclick={() => openLocationInMaps(event?.location ?? null)}
                class="btn btn-ghost btn-sm btn-square"
                title={$_("calendar.openInMaps")}
              >
                <ExternalLink size={16} />
              </button>
            </div>
          </div>
        {/if}

        <!-- URL -->
        {#if event && event.url}
          <div class="flex items-start gap-3">
            <div class="mt-1">
              <Link size={18} class="text-base-content/70" />
            </div>
            <!-- Use a button styled as a link to call openUrl -->
            <button
              onclick={() => openEventUrl(event?.url ?? null)}
              class="btn text-md btn-link p-0 h-auto font-medium text-accent hover:underline truncate text-left normal-case"
              title={event.url}
            >
              {event.url}
            </button>
          </div>
        {/if}

        <!-- Participants -->
        {#if event.participants && event.participants.length > 0}
          <div class="flex items-start gap-3">
            <div class="mt-1">
              <Users size={18} class="text-base-content/70" />
            </div>
            <p class="font-medium">{formatParticipants(event.participants)}</p>
          </div>
        {/if}

        <!-- Notes / Description -->
        {#if event.notes}
          <div class="divider"></div>
          <div class="flex items-start gap-3">
            <div class="mt-1">
              <FileText size={18} class="text-base-content/70" />
            </div>
            <!-- Render sanitized HTML notes -->
            <div
              class="prose whitespace-pre prose-sm max-w-none text-base-content"
              onclick={handleNoteLinkClick}
              role="group"
              tabindex="0"
            >
              {@html linkifyAndSanitize(event.notes)}
            </div>
          </div>
        {/if}
      </div>
    {:else if !event && eventId}
      <!-- Event Not Found State -->
      <div class="text-center text-base-content/70 mt-10">
        <p>{$_("calendar.eventNotFound", { values: { eventId } })}</p>
        <!-- Optionally add a button to go back or refresh -->
      </div>
    {:else}
      <!-- Initial Loading State (before eventId is resolved or store checked) -->
      <div class="text-center text-base-content/70 mt-10">
        <p>{$_("calendar.loadingEvent")}</p>
      </div>
    {/if}
  </div>
</div>
