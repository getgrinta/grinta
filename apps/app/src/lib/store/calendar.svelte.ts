import {
  getCalendarAuthorizationStatus,
  requestCalendarAccess,
  getCalendars,
  getCalendarEvents,
} from "$lib/grinta-invoke";
import type { CalendarInfo, EventInfo } from "$lib/types/calendar";
import { CalendarAuthorizationStatus } from "$lib/types/calendar";

export class CalendarStore {
  authorizationStatus = $state(CalendarAuthorizationStatus.NotDetermined);
  availableCalendars = $state<CalendarInfo[]>([]);
  events = $state<EventInfo[]>([]);
  isLoading = $state(false);
  error = $state<string | null>(null);
  lastFetchedRange = $state<{ start: Date; end: Date } | null>(null);
  selectedCalendarIdentifiers = $state<string[]>([]);

  async checkAuthAndFetchCalendars() {
    try {
      this.isLoading = true;
      this.error = null;
      const status = await getCalendarAuthorizationStatus();
      this.authorizationStatus = status;

      if (status === CalendarAuthorizationStatus.Authorized) {
        const calendars = await getCalendars();
        this.availableCalendars = calendars;
        if (
          this.selectedCalendarIdentifiers.length === 0 &&
          calendars.length > 0
        ) {
          this.selectedCalendarIdentifiers = calendars.map((c) => c.identifier);
        }

        this.refetchEventsIfAuthorized();
      } else if (status === CalendarAuthorizationStatus.NotDetermined) {
        this.tryRequestAccess();
      } else {
        this.availableCalendars = [];
        this.events = [];
      }
    } catch (err: any) {
      console.error("Error checking auth or fetching calendars:", err);
      this.error = err.message || "Failed to load calendar data.";
      this.authorizationStatus = CalendarAuthorizationStatus.Denied;
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
      this.events = [];
      return;
    }
    if (this.selectedCalendarIdentifiers.length === 0) {
      this.events = [];
      return;
    }

    this.isLoading = true;
    this.error = null;
    try {
      const fetchedEvents = await getCalendarEvents(
        this.selectedCalendarIdentifiers,
        startDate.toISOString(),
        endDate.toISOString(),
      );
      this.events = fetchedEvents;
      this.lastFetchedRange = { start: startDate, end: endDate };
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
    const numberOfDaysToFetch = 30;

    await this.fetchEventsForDateRange(
      new Date(),
      new Date(Date.now() + numberOfDaysToFetch * 24 * 60 * 60 * 1000),
    );
  }

  async refreshAuthorization() {
    await this.checkAuthAndFetchCalendars();
  }

  async tryRequestAccess() {
    if (
      this.authorizationStatus === CalendarAuthorizationStatus.NotDetermined
    ) {
      try {
        this.isLoading = true;
        const authorizationStatus = await requestCalendarAccess();

        if (authorizationStatus === CalendarAuthorizationStatus.Authorized) {
          await this.checkAuthAndFetchCalendars();
        } else {
          this.authorizationStatus = authorizationStatus;
        }
      } catch (err: any) {
        console.error("Error requesting calendar access:", err);
        this.error = err.message || "Failed to request access.";
        this.authorizationStatus = CalendarAuthorizationStatus.Denied;
      } finally {
        if (this.authorizationStatus === CalendarAuthorizationStatus.Denied) {
          this.isLoading = false;
        }
      }
    } else {
      const calendars = await getCalendars();
      this.availableCalendars = calendars;
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
    if (
      this.authorizationStatus !== CalendarAuthorizationStatus.Authorized ||
      this.selectedCalendarIdentifiers.length === 0
    ) {
      this.events = [];
      return;
    }

    try {
      const events = await getCalendarEvents(
        this.selectedCalendarIdentifiers,
        new Date().toISOString(),
        new Date().toISOString(),
      );
      this.events = events;
    } catch (error) {
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
    this.selectedCalendarIdentifiers = identifiers;
    if (
      this.lastFetchedRange &&
      this.authorizationStatus === CalendarAuthorizationStatus.Authorized
    ) {
      this.#fetchEventsForRange(
        this.lastFetchedRange.start,
        this.lastFetchedRange.end,
      );
    }
  }
}

export const calendarStore = new CalendarStore();
