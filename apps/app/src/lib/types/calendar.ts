// Corresponds to CalendarAuthorizationStatus in Rust
export enum CalendarAuthorizationStatus {
  NotDetermined = "notDetermined",
  Restricted = "restricted",
  Denied = "denied",
  Authorized = "authorized",
}

// Corresponds to CalendarInfo in Rust
export interface CalendarInfo {
  identifier: string;
  title: string;
  color: string; // Hex color string like "#RRGGBB"
}
export interface ParticipantInfo {
  name: string | null;
}

// Corresponds to EventInfo in Rust
export interface EventInfo {
  identifier: string;
  title: string;
  notes: string | null;
  url: string | null; // Added URL
  participants: ParticipantInfo[]; // Added participants array
  start_date: string; // ISO 8601 string
  end_date: string; // ISO 8601 string
  calendar_id: string;
  location: string | null;
  is_all_day: boolean;
}
