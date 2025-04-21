<script lang="ts">
  import { _ } from "svelte-i18n";
  import { settingsStore } from "$lib/store/settings.svelte";
  import { calendarStore } from "$lib/store/calendar.svelte";
  import { toast } from "svelte-sonner";
  import { CalendarAuthorizationStatus } from "$lib/types/calendar";

  // No local state or effects needed, bind directly to the store's reactive data

  async function handleRequestAuth() {
    try {
      // Call the store's method which handles the request and refresh
      await calendarStore.tryRequestAccess();
      // The store should update reactively, toast messages can indicate progress/result
      // Toast messages might need adjustment based on how tryRequestAccess behaves
      toast.info($_("settings.calendar.checkingAccess"));
      // Check status after a short delay as store updates might not be immediate
      setTimeout(() => {
        if (calendarStore.availableCalendars.length > 0) {
          toast.success($_("settings.calendar.accessGrantedOrAlreadyHad"));
        } else {
          // If still no calendars, could be denied or no calendars configured
          toast.warning($_("settings.calendar.noCalendarsFoundAfterRequest"));
        }
      }, 1000); // Adjust delay as needed
    } catch (error) {
      console.error("Error during calendar access request flow:", error);
      toast.error($_("settings.calendar.requestError"));
    }
  }
</script>

<div class="">
  {#if calendarStore.authorizationStatus === CalendarAuthorizationStatus.Authorized}
    <p class="text-sm text-base-content/70 mb-4">
      {$_("settings.calendar.description")}
    </p>
    <div class="grid grid-cols-2 gap-x-4 gap-y-2 pr-2">
      {#each calendarStore.availableCalendars as calendar (calendar.identifier)}
        <label
          class="flex items-center space-x-3 cursor-pointer p-2 hover:bg-base-200 rounded-md"
        >
          <input
            type="checkbox"
            bind:group={settingsStore.data.selectedCalendarIdentifiers}
            onchange={() => {
              settingsStore.persist();
              calendarStore.selectedCalendarIdentifiers =
                settingsStore.data.selectedCalendarIdentifiers;
              calendarStore.refetchEventsIfAuthorized();
            }}
            value={calendar.identifier}
            class="checkbox checkbox-primary"
          />
          <span
            class="inline-block h-3 w-3 rounded-full"
            style="background-color: {calendar.color ?? '#808080'};"
          ></span>
          <span class="flex-1 truncate">{calendar.title}</span>
        </label>
      {/each}
    </div>
  {:else}
    <div class="flex flex-col items-center justify-center p-4 gap-2">
      <p class="text-sm text-base-content/70 text-center">
        {$_("settings.calendar.noCalendars")}
      </p>
      <button class="btn btn-primary btn-sm" onclick={handleRequestAuth}>
        {$_("settings.calendar.requestAuthButton")}
      </button>
    </div>
  {/if}
</div>
