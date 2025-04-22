<script lang="ts">
  import { _ } from "svelte-i18n";
  import { settingsStore } from "$lib/store/settings.svelte";
  import { calendarStore } from "$lib/store/calendar.svelte";
  import { toast } from "svelte-sonner";
  import { CalendarAuthorizationStatus } from "$lib/types/calendar";
  import { Command } from "@tauri-apps/plugin-shell";

  async function handleRequestAuth() {
    try {
      await calendarStore.tryRequestAccess();
      toast.info($_("settings.calendar.checkingAccess"));

      setTimeout(() => {
        if (calendarStore.availableCalendars.length > 0) {
          toast.success($_("settings.calendar.accessGrantedOrAlreadyHad"));
        } else {
          toast.warning($_("settings.calendar.noCalendarsFoundAfterRequest"));
        }
      }, 1000);
    } catch (error) {
      console.log(error);
      console.error("Error during calendar access request flow:", error);
      toast.error($_("settings.calendar.requestError"));
    }
  }

  const handleOpenCalendarPrivacySettings = async () => {
    try {
      await Command.create("open", [
        "x-apple.systempreferences:com.apple.preference.security?Privacy_Calendars",
      ]).execute();
    } catch (error) {
      console.error("Failed to open System Settings:", error);
      toast.error($_("settings.calendar.openSettingsError")); // Assuming an error key exists
    }
  };

  async function handleResetIgnoredEvents() {
    try {
      settingsStore.data.ignoredEventIds = [];
      await settingsStore.persist();
      toast.success($_("settings.calendar.resetIgnoredEventsSuccess"));
    } catch (error) {
      console.error("Failed to reset ignored events:", error);
      toast.error($_("settings.calendar.resetIgnoredEventsError"));
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
  {:else if calendarStore.authorizationStatus === CalendarAuthorizationStatus.Denied}
    <div class="flex flex-col items-center justify-center p-4 gap-2">
      <p class="text-sm text-base-content/70 text-center">
        {$_("settings.calendar.permissionDenied")}
      </p>
      <button class="btn btn-sm" onclick={handleOpenCalendarPrivacySettings}>
        {$_("settings.calendar.openSettingsButton")}
      </button>
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

  {#if settingsStore.data.ignoredEventIds?.length > 0}
    <div class="mt-4 pt-4 border-t border-base-300 flex justify-center">
      <button class="btn btn-warning btn-sm" onclick={handleResetIgnoredEvents}>
        {$_("settings.calendar.resetIgnoredEventsButton")}
      </button>
    </div>
  {/if}
</div>
