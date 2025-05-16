export enum CalendarAuthorizationStatus {
  NotDetermined = "notDetermined",
  Restricted = "restricted",
  Denied = "denied",
  Authorized = "authorized",
}
export interface CalendarInfo {
  identifier: string;
  title: string;
  color: string; // #RRGGBB
}
export interface ParticipantInfo {
  name: string | null;
}
export interface EventInfo {
  identifier: string;
  title: string;
  notes: string | null;
  url: string | null;
  participants: ParticipantInfo[];
  start_date: string; // ISO 8601
  end_date: string; // ISO 8601
  calendar_id: string;
  location: string | null;
  is_all_day: boolean;
}
