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
  import { LeafletMap, Marker, TileLayer } from "svelte-leafletjs";
  import type { MapOptions } from "leaflet";
  import { onMount } from "svelte";

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

  const DEFAULT_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const DEFAULT_TILE_LAYER_OPTIONS = {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  };

  let mapKey = $state(0);
  let mapOptions = $state<MapOptions>({
    center: [1.364917, 103.822872],
    zoom: 11,
    scrollWheelZoom: false,
  });

  let isFetchingCoordinates = $state(false);
  let mapShouldRender = $state(false);

  onMount(async () => {
    await import("leaflet/dist/leaflet.css");

    const locationQuery = event?.location;
    if (locationQuery) {
      isFetchingCoordinates = true;
      mapShouldRender = false;

      const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationQuery)}&limit=1`;

      try {
        const response = await fetch(nominatimUrl, {
          headers: {
            "User-Agent": navigator.userAgent,
          },
        });

        if (!response.ok) {
          throw new Error(
            `Nominatim API request failed: ${response.status} ${response.statusText}`,
          );
        }
        const data = await response.json();

        if (data && data.length > 0) {
          const place = data[0];
          const lat = parseFloat(place.lat);
          const lon = parseFloat(place.lon);

          mapOptions.center = [lat, lon];
          mapOptions.zoom = 14;
          mapKey++;
          mapShouldRender = true;
        } else {
          console.warn(`No coordinates found for location: "${locationQuery}"`);
          mapShouldRender = false;
        }
      } catch (error) {
        console.error("Error fetching coordinates from Nominatim:", error);
        mapShouldRender = false;
      } finally {
        isFetchingCoordinates = false;
      }
    } else {
      mapShouldRender = false; // No location provided
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

  function handleSingleParticipantClick(email: string | null | undefined) {
    if (email) {
      openUrl(`mailto:${email}`);
    }
  }

  function handleParticipantsClick(currentEvent: EventInfo | null) {
    if (
      !currentEvent ||
      !currentEvent.participants ||
      currentEvent.participants.length === 0
    )
      return;

    const emails = currentEvent.participants
      .map((p) => p.name) // Placeholder for actual email property
      .filter((email): email is string => !!email)
      .filter((email, index, self) => self.indexOf(email) === index);

    if (emails.length > 0) {
      const mailtoLink = `mailto:${emails.join(",")}`;
      openUrl(mailtoLink);
    }
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
      // Remove Google Calendar delimiters
      .replace(
        "-::~:~::~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~::~:~::-\n",
        "",
      )
      .replace(
        "\n-::~:~::~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~::~:~::-",
        "",
      )
      // Remove Apple Calendar delimiters
      .replace(/^----\( [a-zA-Z]+ \)----\n\[FaceTime\]\n/, "")
      .replace("---===---", "")
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
    {#snippet input()}
      <div class="flex items-center gap-2 grow h-8">
        {#if event}
          <CalendarIcon size={20} class="text-base-content/70" />
          <span class="font-semibold text-lg truncate py-1"
            >{event?.title || $_("settings.calendar.untitledEvent")}</span
          >
        {:else}
          <span class="font-semibold text-lg py-1 grow"
            >{$_("settings.calendar.loadingEvent")}</span
          >
        {/if}
      </div>
    {/snippet}
    {#snippet addon()}
      <div>
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
    {/snippet}
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
                title={$_("settings.calendar.openInMaps")}
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
          {@const participantsWithEmail = event.participants.filter(
            (p) => p.name,
          )}
          <div class="flex items-center gap-3">
            <div class="mt-2 self-start">
              <Users size={18} class="text-base-content/70" />
            </div>
            <div class="flex-grow">
              <div class="flex flex-wrap items-center">
                {#each event.participants as participant (participant.name || Math.random())}
                  {#if participant.name}
                    <button
                      class="btn btn-link p-0 h-auto min-h-0 font-medium text-accent hover:underline text-left normal-case"
                      style="line-height: normal;"
                      onclick={() =>
                        handleSingleParticipantClick(participant.name)}
                      title={$_("settings.calendar.composeEmailToParticipant", {
                        values: { name: participant.name || participant.name },
                      })}
                    >
                      {participant.name}
                    </button>
                  {:else}
                    <span
                      class="p-0 h-auto min-h-0 font-medium text-base-content/70"
                      style="line-height: normal;"
                    >
                      {$_("settings.calendar.unknownParticipant")}
                    </span>
                  {/if}
                  {#if event.participants && participant !== event.participants[event.participants.length - 1]}
                    <span class="text-base-content/70 last:hidden">,&nbsp;</span
                    >
                  {/if}
                {/each}
              </div>
            </div>

            {#if participantsWithEmail.length > 0}
              <button
                class="btn btn-primary btn-sm ml-2 self-start flex-shrink-0"
                onclick={() => handleParticipantsClick(event)}
                title={$_("settings.calendar.composeEmailToAllTitle")}
              >
                {$_("settings.calendar.messageAllCaption")}
              </button>
            {/if}
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

        <!-- Map -->
        {#if event && event.location}
          <div class="flex items-start gap-3">
            {#if isFetchingCoordinates}
              <div
                class="flex h-72 w-full items-center justify-center rounded-md border bg-base-200/30 text-sm text-base-content/70"
              >
                Loading map for "{event.location}"...
              </div>
            {:else if mapShouldRender}
              <div class="h-55 w-full rounded-md overflow-hidden border">
                {#key mapKey}
                  <!-- svelte-ignore a11y_click_events_have_key_events -->
                  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
                  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                  <LeafletMap options={mapOptions}>
                    <TileLayer
                      url={DEFAULT_TILE_URL}
                      options={DEFAULT_TILE_LAYER_OPTIONS}
                    />
                    <Marker
                      latLng={[mapOptions.center[0], mapOptions.center[1]]}
                    />
                  </LeafletMap>
                {/key}
              </div>
            {:else}
              <div
                class="flex h-72 w-full items-center justify-center rounded-md border bg-base-200/30 text-sm text-base-content/70"
              >
                Could not retrieve map for "{event.location}".
              </div>
            {/if}
          </div>
        {/if}
      </div>
    {:else if !event && eventId}
      <!-- Event Not Found State -->
      <div class="text-center text-base-content/70 mt-10">
        <p>{$_("settings.calendar.eventNotFound", { values: { eventId } })}</p>
        <!-- Optionally add a button to go back or refresh -->
      </div>
    {:else}
      <!-- Initial Loading State (before eventId is resolved or store checked) -->
      <div class="text-center text-base-content/70 mt-10">
        <p>{$_("settings.calendar.loadingEvent")}</p>
      </div>
    {/if}
  </div>
</div>
