// apps/app/src-tauri/src/calendar_utils.rs

use block::{ConcreteBlock};
use chrono::{DateTime, NaiveDateTime, Utc};
use cocoa::base::{id, nil, YES};
use cocoa::foundation::{NSArray, NSAutoreleasePool, NSUInteger};
use cocoa::appkit::{CGFloat};
use objc::runtime::{Class, Object, BOOL as ObjcBOOL};
use objc::{class, msg_send, sel, sel_impl};
use serde::{Deserialize, Serialize};
use std::ffi::CStr;
use std::sync::mpsc;
use tokio::task; // For spawn_blocking
use tauri::command;
use tauri::State; 
use crate::state::CalendarState;

// Define the authorization status enum matching EKAuthorizationStatus
#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum CalendarAuthorizationStatus {
    NotDetermined = 0,
    Restricted = 1,
    Denied = 2,
    Authorized = 3, // FullAccess in Swift
    // WriteOnly = 4, // Not directly mapped, using Authorized for simplicity for now
}

// Struct to hold calendar information
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CalendarInfo {
    identifier: String,
    title: String,
    color: String, //"#RRGGBB"
}

// Struct to hold participant information
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ParticipantInfo {
    name: Option<String>, // EKParticipant.name
}

// Struct to hold event information
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct EventInfo {
    identifier: String,         // EKEvent.eventIdentifier
    title: String,              // EKEvent.title
    notes: Option<String>,      // EKEvent.notes
    url: Option<String>,        // EKEvent.URL
    participants: Vec<ParticipantInfo>, // EKEvent.participants
    start_date: String,         // EKEvent.startDate (ISO 8601 string)
    end_date: String,           // EKEvent.endDate (ISO 8601 string)
    calendar_id: String,        // EKEvent.calendar.calendarIdentifier
    location: Option<String>,   // EKEvent.location
    is_all_day: bool,           // EKEvent.isAllDay
}

fn event_store_class() -> &'static Class {
    Class::get("EKEventStore").expect("EKEventStore class not found")
}

fn get_store_ptr(state: &State<CalendarState>) -> Result<id, String> {
    let guard = state.event_store.lock().map_err(|e| format!("Failed to lock event store mutex: {}", e))?;
    let obj_ref: &Object = &*guard;
    let ptr = obj_ref as *const Object as id;
    if ptr.is_null() { // Use is_null() for raw pointers
        Err("Event store instance in state is nil".to_string())
    } else {
        Ok(ptr)
    }
}

// Helper to convert NSString to Rust String
unsafe fn nsstring_to_string(ns_string: id) -> String {
    if ns_string == nil {
        return String::new();
    }
    let c_str_ptr: *const std::os::raw::c_char = msg_send![ns_string, UTF8String];
    if c_str_ptr.is_null() {
        return String::new();
    }
    CStr::from_ptr(c_str_ptr).to_string_lossy().into_owned()
}

// Helper to convert NSColor directly to Hex String using components
// NSColor -> NSColor (RGB space) -> RGBA components -> Hex
unsafe fn nscolor_to_hex(ns_color: id) -> String {
    if ns_color == nil {
        return "#000000".to_string(); // Default color: Black
    }

    // Get the device RGB color space
    // Use class method deviceRGBColorSpace which is simpler
    let device_rgb_space: id = msg_send![class!(NSColorSpace), deviceRGBColorSpace];

    if device_rgb_space == nil {
        return "#808080".to_string(); // Fallback: Gray
    }

    // Convert the original color to the device RGB color space
    let color_rgb: id = msg_send![ns_color, colorUsingColorSpace: device_rgb_space];

    if color_rgb == nil {
        // This can happen with pattern colors, etc.
        return "#808080".to_string(); // Fallback: Gray
    }

    // Get the RGBA components directly from the NSColor object
    let red: CGFloat = msg_send![color_rgb, redComponent];
    let green: CGFloat = msg_send![color_rgb, greenComponent];
    let blue: CGFloat = msg_send![color_rgb, blueComponent];
    // let alpha: CGFloat = msg_send![color_rgb, alphaComponent]; // We don't need alpha for #RRGGBB

    // Convert CGFloat (0.0-1.0) to u8 (0-255), clamping values
    let r_u8 = (red.max(0.0).min(1.0) * 255.0).round() as u8;
    let g_u8 = (green.max(0.0).min(1.0) * 255.0).round() as u8;
    let b_u8 = (blue.max(0.0).min(1.0) * 255.0).round() as u8;

    // Format as hex string
    format!("#{:02X}{:02X}{:02X}", r_u8, g_u8, b_u8)
}

unsafe fn datetime_utc_to_nsdate(dt: DateTime<Utc>) -> id {
    let timestamp = dt.timestamp() as f64;
    let nsdate: id = msg_send![class!(NSDate), dateWithTimeIntervalSince1970: timestamp];
    nsdate
}

unsafe fn nsdate_to_datetime_utc(nsdate: id) -> Option<DateTime<Utc>> {
    if nsdate == nil {
        return None;
    }
    let timestamp: f64 = msg_send![nsdate, timeIntervalSince1970];
    NaiveDateTime::from_timestamp_opt(timestamp as i64, (timestamp.fract() * 1_000_000_000.0) as u32)
        .map(|naive| DateTime::<Utc>::from_naive_utc_and_offset(naive, Utc))
}

// Helper to convert NSDate to ISO 8601 string (UTC)
unsafe fn nsdate_to_iso_string(nsdate: id) -> String {
    nsdate_to_datetime_utc(nsdate)
        .map(|dt| dt.to_rfc3339())
        .unwrap_or_else(|| "".to_string())
}

// Helper to parse ISO 8601 string to NSDate
// Assumes input string is UTC or has offset
unsafe fn iso_string_to_nsdate(iso_string: &str) -> Option<id> {
    DateTime::parse_from_rfc3339(iso_string)
        .ok()
        .map(|dt| datetime_utc_to_nsdate(dt.with_timezone(&Utc)))
}

unsafe fn get_calendars_by_ids(store: id, calendar_ids: &[String]) -> Vec<id> {
    const EK_ENTITY_TYPE_EVENT: i64 = 0;
    let all_calendars_nsarray: id = msg_send![store, calendarsForEntityType: EK_ENTITY_TYPE_EVENT];
    if all_calendars_nsarray == nil {
        return Vec::new();
    }

    let mut matching_calendars = Vec::new();
    let count: NSUInteger = NSArray::count(all_calendars_nsarray);

    for i in 0..count {
        let calendar: id = NSArray::objectAtIndex(all_calendars_nsarray, i);
        if calendar == nil {
            continue;
        }

        let identifier_nsstring: id = msg_send![calendar, calendarIdentifier];
        let identifier_str = nsstring_to_string(identifier_nsstring);
        if calendar_ids.contains(&identifier_str) {
            matching_calendars.push(calendar);
        }
    }
    matching_calendars
}

#[command]
pub fn get_calendar_authorization_status() -> Result<CalendarAuthorizationStatus, String> {
    const EK_ENTITY_TYPE_EVENT: i64 = 0;

    let store_class = event_store_class();

    let status_raw: i64 = unsafe {
        msg_send![store_class, authorizationStatusForEntityType: EK_ENTITY_TYPE_EVENT]
    };

    let status = match status_raw {
        0 => CalendarAuthorizationStatus::NotDetermined,
        1 => CalendarAuthorizationStatus::Restricted,
        2 => CalendarAuthorizationStatus::Denied,
        3 => CalendarAuthorizationStatus::Authorized,
        // 4 => CalendarAuthorizationStatus::WriteOnly, // EKAuthorizationStatusWriteOnly - Handle if needed
        _ => return Err(format!("Unknown calendar authorization status: {}", status_raw)),
    };

    Ok(status)
}

#[command]
pub async fn request_calendar_access(state: State<'_, CalendarState>) -> Result<CalendarAuthorizationStatus, String> {
    const EK_ENTITY_TYPE_EVENT: i64 = 0;

    let store = get_store_ptr(&state)?;

    // Check current status first (optional but good practice)
    let current_status = get_calendar_authorization_status()?;
    if current_status == CalendarAuthorizationStatus::Authorized {
        return Ok(current_status);
    }
    if current_status != CalendarAuthorizationStatus::NotDetermined {
        return Ok(current_status);
    }

    let (tx, rx) = mpsc::channel::<bool>(); // Use mpsc channel

    let completion_block = ConcreteBlock::new(move |granted: objc::runtime::BOOL, error: id| -> () {
        let granted_bool = granted == objc::runtime::YES;
        let tx_clone = tx.clone(); // Clone the sender for use in the closure
        if error != nil {
            let description: id = unsafe { msg_send![error, localizedDescription] };
            let description_str = unsafe {
                let c_str = cocoa::foundation::NSString::UTF8String(description);
                std::ffi::CStr::from_ptr(c_str).to_string_lossy().into_owned()
            };
            // Send false on error
            let _ = tx_clone.send(false);
        } else {
            let _ = tx_clone.send(granted_bool); // Use the clone
        }
    }).copy();

    unsafe {
        let _: () = msg_send![store,
            requestFullAccessToEventsWithCompletion: completion_block
        ];
    }

    match task::spawn_blocking(move || rx.recv()).await {
        Ok(Ok(granted)) => Ok(CalendarAuthorizationStatus::Authorized),
        Ok(Err(_)) => Err("Calendar access completion handler channel closed unexpectedly.".to_string()),
        Err(_) => Err("Failed to run blocking task for calendar access result.".to_string()),
    }
}

#[command]
pub fn get_calendar_events(
    state: State<CalendarState>,
    calendar_ids: Vec<String>,
    start_date_iso: String,
    end_date_iso: String,
) -> Result<Vec<EventInfo>, String> {
    let _pool = unsafe { NSAutoreleasePool::new(nil) };

    // Check auth status
    match get_calendar_authorization_status()? {
        CalendarAuthorizationStatus::Authorized => (),
        _ => return Err("Calendar access not authorized.".to_string()),
    }

    let store = get_store_ptr(&state)?;

    unsafe {
        // Convert dates
        let start_date_ns = iso_string_to_nsdate(&start_date_iso)
            .ok_or_else(|| format!("Invalid start date format: {}", start_date_iso))?;
        let end_date_ns = iso_string_to_nsdate(&end_date_iso)
            .ok_or_else(|| format!("Invalid end date format: {}", end_date_iso))?;

        // Get calendar objects
        let calendars_nsarray = if calendar_ids.is_empty() {
            // If no specific IDs are provided, fetch from all accessible event calendars
            const EK_ENTITY_TYPE_EVENT: i64 = 0;
            let all_calendars: id = msg_send![store, calendarsForEntityType: EK_ENTITY_TYPE_EVENT];
            if all_calendars == nil { NSArray::array(nil) } else { all_calendars } // Use empty array if nil
        } else {
            let calendar_objs = get_calendars_by_ids(store, &calendar_ids);
            if calendar_objs.is_empty() {
                // Return empty vec if no matching calendars found or provided IDs were invalid
                return Ok(Vec::new());
            }
            NSArray::arrayWithObjects(nil, &calendar_objs)
        };

        if calendars_nsarray == nil || NSArray::count(calendars_nsarray) == 0 {
            return Ok(Vec::new()); // No calendars to search in
        }

        // Create predicate
        // Equivalent to: [store predicateForEventsWithStartDate:startDate endDate:endDate calendars:calendars];
        let predicate: id = msg_send![store, predicateForEventsWithStartDate:start_date_ns endDate:end_date_ns calendars:calendars_nsarray];

        // Fetch events
        // Equivalent to: [store eventsMatchingPredicate:predicate];
        let events_nsarray: id = msg_send![store, eventsMatchingPredicate:predicate];

        if events_nsarray == nil {
            return Ok(Vec::new());
        }

        let mut events_vec = Vec::new();
        let count: NSUInteger = NSArray::count(events_nsarray);

        for i in 0..count {
            let event: id = NSArray::objectAtIndex(events_nsarray, i);

            // Extract event properties
            let identifier: id = msg_send![event, eventIdentifier];
            let title: id = msg_send![event, title];
            let notes: id = msg_send![event, notes];
            let start_date: id = msg_send![event, startDate];
            let end_date: id = msg_send![event, endDate];
            let calendar: id = msg_send![event, calendar];
            let calendar_id: id = msg_send![calendar, calendarIdentifier];
            let location: id = msg_send![event, location];
            let is_all_day: ObjcBOOL = msg_send![event, isAllDay];
            let url_nsurl: id = msg_send![event, URL]; // Get NSURL
            let participants_nsarray: id = msg_send![event, attendees];

            let mut participants = Vec::new();
            if participants_nsarray != nil {
                let participants_count: NSUInteger = NSArray::count(participants_nsarray);
                for j in 0..participants_count {
                    let participant: id = NSArray::objectAtIndex(participants_nsarray, j);
                    let name: id = msg_send![participant, name];
                    let participant_info = ParticipantInfo {
                        name: if name != nil { Some(nsstring_to_string(name)) } else { None },
                    };
                    participants.push(participant_info);
                }
            }

            let event_info = EventInfo {
                identifier: nsstring_to_string(identifier),
                title: nsstring_to_string(title),
                notes: if notes != nil { Some(nsstring_to_string(notes)) } else { None },
                // Correctly handle NSURL -> NSString -> Rust String
                url: if url_nsurl != nil {
                    let url_nsstring: id = msg_send![url_nsurl, absoluteString];
                    if url_nsstring != nil {
                         Some(nsstring_to_string(url_nsstring))
                    } else {
                        None // absoluteString returned nil
                    }
                } else {
                    None // URL property was nil
                },
                participants,
                start_date: nsdate_to_iso_string(start_date),
                end_date: nsdate_to_iso_string(end_date),
                calendar_id: nsstring_to_string(calendar_id),
                location: if location != nil { Some(nsstring_to_string(location)) } else { None },
                is_all_day: is_all_day == YES,
            };
            events_vec.push(event_info);
        }
        Ok(events_vec)
    }
}

#[command]
pub fn get_calendars(state: State<CalendarState>) -> Result<Vec<CalendarInfo>, String> {
    let _pool = unsafe { NSAutoreleasePool::new(nil) }; // Manage memory
    const EK_ENTITY_TYPE_EVENT: i64 = 0;

    // Check auth status first
    match get_calendar_authorization_status()? {
        CalendarAuthorizationStatus::Authorized => (),
        status => {
            return Err("Calendar access not authorized.".to_string());
        }
    }

    let store = get_store_ptr(&state)?;

    let calendars_nsarray: id = unsafe { msg_send![store, calendarsForEntityType: EK_ENTITY_TYPE_EVENT] };

    if calendars_nsarray == nil {
        return Err("Empty list!!!!.".to_string());
    }

    let mut calendars_vec = Vec::new();
    let count: NSUInteger = unsafe { NSArray::count(calendars_nsarray) };

    for i in 0..count {
        unsafe {
            let calendar: id = NSArray::objectAtIndex(calendars_nsarray, i);
            if calendar == nil {
                continue;
            }

            // Get properties
            let identifier: id = msg_send![calendar, calendarIdentifier];
            let title: id = msg_send![calendar, title];
            let color: id = msg_send![calendar, color]; // This is NSColor

            let identifier_str = nsstring_to_string(identifier);
            let title_str = nsstring_to_string(title);
            let color_hex = nscolor_to_hex(color);

            let calendar_info = CalendarInfo {
                identifier: identifier_str,
                title: title_str,
                color: color_hex,
            };
            calendars_vec.push(calendar_info);
        }
    }
    Ok(calendars_vec)
}
