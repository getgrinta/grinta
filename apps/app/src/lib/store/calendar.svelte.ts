import {
  getCalendarAuthorizationStatus,
  requestCalendarAccess,
  getCalendars,
  getCalendarEvents,
} from "$lib/grinta-invoke";
import type { CalendarInfo, EventInfo } from "$lib/types/calendar";
import { CalendarAuthorizationStatus } from "$lib/types/calendar";
import { settingsStore } from "./settings.svelte";
// import { settings } from './settings-store.svelte'; // Import later when needed

// State properties are defined directly in the class with $state

export class CalendarStore {
  // --- Reactive State ---
  authorizationStatus = $state(CalendarAuthorizationStatus.NotDetermined);
  availableCalendars = $state<CalendarInfo[]>([]);
  events = $state<EventInfo[]>([]);
  isLoading = $state(false);
  error = $state<string | null>(null);
  lastFetchedRange = $state<{ start: Date; end: Date } | null>(null);
  selectedCalendarIdentifiers = $state<string[]>([]); // TODO: Load from settings later

  constructor() {
    console.log("CalendarStore initializing..."); // Initial check and fetch on instantiation
    // TODO: Effect to load selectedCalendarIdentifiers from settings store once
    // TODO: Effect to persist selectedCalendarIdentifiers to settings store when it changes
    // $effect(() => { persist(this.selectedCalendarIdentifiers) }) // Example Svelte 5 effect
  }

  // --- Private Methods ---

  async checkAuthAndFetchCalendars() {
    try {
      this.isLoading = true;
      this.error = null;
      const status = await getCalendarAuthorizationStatus();
      this.authorizationStatus = status;

      if (status === CalendarAuthorizationStatus.Authorized) {
        const calendars = await getCalendars();
        this.availableCalendars = calendars;
        // TODO: Load selectedCalendarIdentifiers from settings
        if (
          this.selectedCalendarIdentifiers.length === 0 &&
          calendars.length > 0
        ) {
          // Select all by default if none were selected or loaded
          this.selectedCalendarIdentifiers = calendars.map((c) => c.identifier);
        }

        this.refetchEventsIfAuthorized();
        // If already authorized, don't clear events here, let fetch handle it
      } else if (status === CalendarAuthorizationStatus.NotDetermined) {
        // If status is not determined, try to request access.
        // We don't need to clear calendars/events here as the user might grant access.
        console.log(
          "Authorization status not determined, attempting to request access...",
        );
        this.tryRequestAccess(); // Call request access, no need to await here
      } else {
        console.log("que");
        this.availableCalendars = [];
        // Don't clear selected identifiers, keep them in case auth is granted later
        this.events = []; // Clear events if not authorized
      }
    } catch (err: any) {
      console.error("Error checking auth or fetching calendars:", err);
      this.error = err.message || "Failed to load calendar data.";
      this.authorizationStatus = CalendarAuthorizationStatus.Denied; // Assume worst case
      this.availableCalendars = [];
      this.events = [];
    } finally {
      this.isLoading = false;
    }
  }

  async #fetchEventsForRange(startDate: Date, endDate: Date) {
    if (this.authorizationStatus !== CalendarAuthorizationStatus.Authorized) {
      console.warn(
        "Cannot fetch events, authorization denied or not determined.",
      );
      this.events = []; // Clear events if not authorized
      return;
    }
    if (this.selectedCalendarIdentifiers.length === 0) {
      console.warn("Cannot fetch events, no calendars selected.");
      this.events = []; // Clear events if no calendars selected
      return;
    }

    this.isLoading = true;
    this.error = null;
    try {
      console.log(
        `Fetching events from ${startDate.toISOString()} to ${endDate.toISOString()} for calendars:`,
        this.selectedCalendarIdentifiers,
      );
      const fetchedEvents = await getCalendarEvents(
        this.selectedCalendarIdentifiers,
        startDate.toISOString(),
        endDate.toISOString(),
      );
      this.events = fetchedEvents;
      this.lastFetchedRange = { start: startDate, end: endDate };
      console.log(`Fetched ${fetchedEvents.length} events.`);
    } catch (err: any) {
      console.error("Error fetching calendar events:", err);
      this.error = err.message || "Failed to fetch events.";
      this.events = [];
    } finally {
      this.isLoading = false;
    }
  }

  // --- Public API Methods ---

  initialize({
    selectedCalendarIdentifiers,
  }: {
    selectedCalendarIdentifiers: string[];
  }) {
    this.selectedCalendarIdentifiers = selectedCalendarIdentifiers;
    this.checkAuthAndFetchCalendars();
  }

  async refetchEventsIfAuthorized() {
    if (this.authorizationStatus !== CalendarAuthorizationStatus.Authorized) {
      return;
    }

    await this.fetchEventsForDateRange(
      new Date(),
      new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    );
  }

  async refreshAuthorization() {
    await this.checkAuthAndFetchCalendars();
  }

  async tryRequestAccess() {
    if (
      this.authorizationStatus === CalendarAuthorizationStatus.NotDetermined
    ) {
      console.log("Requesting calendar access...");
      try {
        this.isLoading = true;
        const granted = await requestCalendarAccess();
        console.log("Calendar access granted:", granted);
        // No need to set status directly, re-check auth handles it
        if (granted) {
          await this.checkAuthAndFetchCalendars(); // Re-fetch calendars after grant
        } else {
          this.authorizationStatus = CalendarAuthorizationStatus.Denied;
        }
      } catch (err: any) {
        console.error("Error requesting calendar access:", err);
        this.error = err.message || "Failed to request access.";
        this.authorizationStatus = CalendarAuthorizationStatus.Denied;
      } finally {
        // Only set loading false if access was denied immediately or error occurred
        // Otherwise, #checkAuthAndFetchCalendars will handle it.
        if (this.authorizationStatus === CalendarAuthorizationStatus.Denied) {
          this.isLoading = false;
        }
      }
    } else {
      console.log("Request skipped, status is not NotDetermined:");

      const calendars = await getCalendars();
      this.availableCalendars = calendars;

      console.log(this.availableCalendars);
    }
  }

  async fetchEventsForDay(date: Date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    await this.#fetchEventsForRange(start, end);
  }

  async fetchEventsForToday() {
    console.log("[CalendarStore] fetchEventsForToday called"); // Debug log
    // Only fetch if authorized and calendars are selected
    if (
      this.authorizationStatus !== CalendarAuthorizationStatus.Authorized ||
      this.selectedCalendarIdentifiers.length === 0
    ) {
      console.log(
        "[CalendarStore] Skipping event fetch: Not authorized or no calendars selected.",
      ); // Debug log
      this.events = [];
      return;
    }

    try {
      console.log(
        "[CalendarStore] Invoking getCalendarEvents with calendars:",
        this.selectedCalendarIdentifiers,
      ); // Debug log
      const events = await getCalendarEvents(
        this.selectedCalendarIdentifiers,
        new Date().toISOString(),
        new Date().toISOString(),
      );
      console.log("[CalendarStore] Received events from backend:", events); // Debug log
      this.events = events;
    } catch (error) {
      console.error("[CalendarStore] Error fetching events:", error);
      this.events = [];
    }
  }

  async fetchEventsForDateRange(startDate: Date, endDate: Date) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    await this.#fetchEventsForRange(start, end);
  }

  setSelectedCalendars(identifiers: string[]) {
    console.log("Setting selected calendars:", identifiers);
    this.selectedCalendarIdentifiers = identifiers;
    // TODO: Persist selectedCalendarIdentifiers to settings store here

    // Refetch events for the current range if it exists and we are authorized
    if (
      this.lastFetchedRange &&
      this.authorizationStatus === CalendarAuthorizationStatus.Authorized
    ) {
      this.#fetchEventsForRange(
        this.lastFetchedRange.start,
        this.lastFetchedRange.end,
      );
    } else if (this.lastFetchedRange) {
      console.log(
        "Skipping event refetch after calendar selection change: Not authorized.",
      );
      // Optionally clear events when selection changes while not authorized
      // this.events = [];
    }
  }
}

// Export a singleton instance
export const calendarStore = new CalendarStore();
