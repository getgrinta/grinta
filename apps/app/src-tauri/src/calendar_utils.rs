// apps/app/src-tauri/src/calendar_utils.rs

use block::{Block, ConcreteBlock};
use chrono::{DateTime, FixedOffset, Local, NaiveDateTime, Utc};
use cocoa::base::{id, nil, BOOL, YES};
use cocoa::foundation::{NSArray, NSAutoreleasePool, NSComparisonResult, NSDate, NSDictionary, NSInteger, NSString, NSUInteger};
use cocoa::appkit::{NSColor, NSColorSpace, CGFloat};
use core_foundation::base::TCFType;
use core_foundation::string::CFString;
use objc::runtime::{Class, Object, Sel, BOOL as ObjcBOOL};
use objc::{class, msg_send, sel, sel_impl};
use serde::{Deserialize, Serialize};
use std::ffi::CStr;
use std::sync::mpsc;
use tokio::task; // For spawn_blocking
use tauri::command;

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
    color: String, // Store color as hex string e.g., "#RRGGBB"
}

// Struct to hold event information
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct EventInfo {
    identifier: String,         // EKEvent.eventIdentifier
    title: String,              // EKEvent.title
    notes: Option<String>,      // EKEvent.notes
    start_date: String,         // EKEvent.startDate (ISO 8601 string)
    end_date: String,           // EKEvent.endDate (ISO 8601 string)
    calendar_id: String,        // EKEvent.calendar.calendarIdentifier
    location: Option<String>,   // EKEvent.location
    is_all_day: bool,           // EKEvent.isAllDay
}

// Helper function to get the EKEventStore class
fn event_store_class() -> &'static Class {
    Class::get("EKEventStore").expect("EKEventStore class not found")
}

// Helper function to get the shared EKEventStore instance
fn get_event_store_instance() -> id {
    let store_class = event_store_class();
    let store: id = unsafe { msg_send![store_class, new] }; // Create a new instance
    // Note: EKEventStore doesn't have a shared instance like NSWorkspace.
    // Each interaction typically uses a new instance or retains one.
    // For simplicity in Tauri commands, we create a new one each time.
    // Consider managing a shared instance in Tauri state if performance becomes an issue.
    store
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
    println!("[nscolor_to_hex v2] Received ns_color: {:?}", ns_color); // Debug log
    if ns_color == nil {
        println!("[nscolor_to_hex v2] ns_color is nil, returning default."); // Debug log
        return "#000000".to_string(); // Default color: Black
    }

    // Get the device RGB color space
    // Use class method deviceRGBColorSpace which is simpler
    let device_rgb_space: id = msg_send![class!(NSColorSpace), deviceRGBColorSpace];
    println!("[nscolor_to_hex v2] Got device RGB space: {:?}", device_rgb_space); // Debug log

    if device_rgb_space == nil {
        println!("[nscolor_to_hex v2] Failed to get device RGB color space, returning fallback.");
        return "#808080".to_string(); // Fallback: Gray
    }

    // Convert the original color to the device RGB color space
    let color_rgb: id = msg_send![ns_color, colorUsingColorSpace: device_rgb_space];
    println!("[nscolor_to_hex v2] Result of colorUsingColorSpace: {:?}", color_rgb); // Debug log

    if color_rgb == nil {
        println!("[nscolor_to_hex v2] Conversion to RGB space failed, returning fallback."); // Debug log
        // This can happen with pattern colors, etc.
        return "#808080".to_string(); // Fallback: Gray
    }

    // Get the RGBA components directly from the NSColor object
    let red: CGFloat = msg_send![color_rgb, redComponent];
    let green: CGFloat = msg_send![color_rgb, greenComponent];
    let blue: CGFloat = msg_send![color_rgb, blueComponent];
    // let alpha: CGFloat = msg_send![color_rgb, alphaComponent]; // We don't need alpha for #RRGGBB

    println!(
        "[nscolor_to_hex v2] Components: R={}, G={}, B={}",
        red, green, blue
    ); // Debug log

    // Convert CGFloat (0.0-1.0) to u8 (0-255), clamping values
    let r_u8 = (red.max(0.0).min(1.0) * 255.0).round() as u8;
    let g_u8 = (green.max(0.0).min(1.0) * 255.0).round() as u8;
    let b_u8 = (blue.max(0.0).min(1.0) * 255.0).round() as u8;

    println!(
        "[nscolor_to_hex v2] Components u8: R={}, G={}, B={}",
        r_u8, g_u8, b_u8
    ); // Debug log

    // Format as hex string
    let hex = format!("#{:02X}{:02X}{:02X}", r_u8, g_u8, b_u8);
    println!("[nscolor_to_hex v2] Formatted hex: {}", hex);
    hex
}

// Helper to convert Rust chrono DateTime<Utc> to NSDate
unsafe fn datetime_utc_to_nsdate(dt: DateTime<Utc>) -> id {
    let timestamp = dt.timestamp() as f64;
    // timeIntervalSince1970 expects seconds since 1970-01-01 00:00:00 UTC
    let nsdate: id = msg_send![class!(NSDate), dateWithTimeIntervalSince1970: timestamp];
    nsdate
}

// Helper to convert NSDate to chrono DateTime<Utc>
unsafe fn nsdate_to_datetime_utc(nsdate: id) -> Option<DateTime<Utc>> {
    if nsdate == nil {
        return None;
    }
    // timeIntervalSince1970 returns seconds since 1970-01-01 00:00:00 UTC
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

// Helper to get EKCalendar objects by identifiers
unsafe fn get_calendars_by_ids(store: id, calendar_ids: &[String]) -> Vec<id> {
    println!("Fetching calendars by IDs... ENTER"); // 1. Entry point
    println!("Fetching calendars by IDs... Checking calendar IDs: {:?}", calendar_ids); // 2. Before checking IDs
    // calendarsWithIdentifiers: is not a standard EKEventStore method.
    // We need to fetch all calendars and filter.
    const EK_ENTITY_TYPE_EVENT: i64 = 0;
    let all_calendars_nsarray: id = msg_send![store, calendarsForEntityType: EK_ENTITY_TYPE_EVENT];
    println!("Fetching calendars by IDs... calendarsForEntityType result: {:?}", all_calendars_nsarray); // 3. After msg_send for calendars
    if all_calendars_nsarray == nil {
        println!("Fetching calendars by IDs... Resulting NSArray is nil, returning empty vec."); // 4a. Array is nil
        return Vec::new();
    }

    let mut matching_calendars = Vec::new();
    let count: NSUInteger = NSArray::count(all_calendars_nsarray);
    println!("Fetching calendars by IDs... Calendar count: {}", count); // 5. After getting count

    for i in 0..count {
        println!("Fetching calendars by IDs... LOOP START: Index {}", i); // 6. Loop start
        let calendar: id = NSArray::objectAtIndex(all_calendars_nsarray, i);
        println!("Fetching calendars by IDs... Calendar object: {:?}", calendar); // 7. After objectAtIndex
        if calendar == nil {
            println!("Fetching calendars by IDs... WARNING: Calendar object at index {} is nil, skipping.", i); // 8a. Calendar object is nil
            continue;
        }

        let identifier_nsstring: id = msg_send![calendar, calendarIdentifier];
        println!("Fetching calendars by IDs... Identifier object: {:?}", identifier_nsstring); // 9. After identifier msg_send
        let identifier_str = nsstring_to_string(identifier_nsstring);
        println!("Fetching calendars by IDs... Identifier string: {}", identifier_str); // 10. After id conversion
        if calendar_ids.contains(&identifier_str) {
            println!("Fetching calendars by IDs... Matching calendar found: {}", identifier_str); // 11. Matching calendar found
            matching_calendars.push(calendar);
        }
    }
    println!("Fetching calendars by IDs... Exiting loop successfully."); // 12. After loop finished
    println!("Fetching calendars by IDs... Matching calendars: {:?}", matching_calendars); // 13. After loop finished
    matching_calendars
}

#[command]
pub fn get_calendar_authorization_status() -> Result<CalendarAuthorizationStatus, String> {
    println!("Checking calendar authorization status...");
    // EKEntityTypeEvent = 0
    const EK_ENTITY_TYPE_EVENT: i64 = 0;

    let store_class = event_store_class();

    // Get the authorization status
    // Equivalent to: [EKEventStore authorizationStatusForEntityType:EKEntityTypeEvent];
    let status_raw: i64 = unsafe {
        msg_send![store_class, authorizationStatusForEntityType: EK_ENTITY_TYPE_EVENT]
    };
    println!("Raw calendar status: {}", status_raw);

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
pub async fn request_calendar_access() -> Result<bool, String> {
    println!("Requesting calendar access...");
    const EK_ENTITY_TYPE_EVENT: i64 = 0;

    // Check current status first (optional but good practice)
    let current_status = get_calendar_authorization_status()?;
    if current_status == CalendarAuthorizationStatus::Authorized {
        println!("Calendar access already authorized.");
        return Ok(true);
    }
    if current_status != CalendarAuthorizationStatus::NotDetermined {
        println!(
            "Calendar access not determinable or already denied/restricted. Status: {:?}",
            current_status
        );
        // Return Ok(false) as the request won't proceed if not NotDetermined
        // Or you could return an error, depending on desired frontend handling
        return Ok(false);
    }

    let store = get_event_store_instance();
    let (tx, rx) = mpsc::channel::<bool>(); // Use mpsc channel

    // Create the completion handler block
    // The block takes two arguments: (BOOL granted, NSError *error)
    let completion_block = ConcreteBlock::new(move |granted: objc::runtime::BOOL, error: id| -> () {
        let granted_bool = granted == objc::runtime::YES;
        let tx_clone = tx.clone(); // Clone the sender for use in the closure
        if error != nil {
            let description: id = unsafe { msg_send![error, localizedDescription] };
            let description_str = unsafe {
                let c_str = cocoa::foundation::NSString::UTF8String(description);
                std::ffi::CStr::from_ptr(c_str).to_string_lossy().into_owned()
            };
            eprintln!("Error requesting calendar access: {}", description_str);
            // Send false on error
            let _ = tx_clone.send(false); // Use the clone
        } else {
            println!("Calendar access request completed. Granted: {}", granted_bool);
            let _ = tx_clone.send(granted_bool); // Use the clone
        }
    }).copy(); // Add .copy() to satisfy Fn requirement

    // Call requestFullAccessToEventsWithCompletion:
    // Swift equivalent: store.requestFullAccessToEvents { granted, error in ... }
    // Note: The selector name might vary slightly based on SDK version or specific method,
    // ensure 'requestFullAccessToEventsWithCompletion:' is correct for your target macOS.
    // Older versions might use `requestAccessToEntityType:completion:`
    unsafe {
        let _: () = msg_send![store,
            requestFullAccessToEventsWithCompletion: completion_block // Pass value directly
        ];
        // Keep the block alive until the completion handler is called
        // In this async context, we await the oneshot channel below, so the block scope is maintained.
    }

    // Await the result from the completion handler
    match task::spawn_blocking(move || rx.recv()).await {
        Ok(Ok(granted)) => Ok(granted), // Inner Ok from recv, Outer Ok from spawn_blocking join
        Ok(Err(_)) => Err("Calendar access completion handler channel closed unexpectedly.".to_string()),
        Err(_) => Err("Failed to run blocking task for calendar access result.".to_string()),
    }
}

#[command]
pub fn get_calendar_events(
    calendar_ids: Vec<String>,
    start_date_iso: String,
    end_date_iso: String,
) -> Result<Vec<EventInfo>, String> {
    println!(
        "Fetching events for calendars: {:?}, start: {}, end: {}",
        calendar_ids,
        start_date_iso,
        end_date_iso
    );
    let _pool = unsafe { NSAutoreleasePool::new(nil) };

    // Check auth status
    match get_calendar_authorization_status()? {
        CalendarAuthorizationStatus::Authorized => (),
        _ => return Err("Calendar access not authorized.".to_string()),
    }

    let store = get_event_store_instance();

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
            println!("No calendars specified or found for event query.");
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
        println!("Found {} raw events.", count);

        for i in 0..count {
            let event: id = NSArray::objectAtIndex(events_nsarray, i);

            // Extract event properties
            let identifier: id = msg_send![event, eventIdentifier];
            let title: id = msg_send![event, title];
            let notes: id = msg_send![event, title];
            let start_date: id = msg_send![event, startDate];
            let end_date: id = msg_send![event, endDate];
            let calendar: id = msg_send![event, calendar];
            let calendar_id: id = msg_send![calendar, calendarIdentifier];
            let location: id = msg_send![event, location];
            let is_all_day: ObjcBOOL = msg_send![event, isAllDay];

            let event_info = EventInfo {
                identifier: nsstring_to_string(identifier),
                title: nsstring_to_string(title),
                notes: if notes != nil { Some(nsstring_to_string(notes)) } else { None },
                start_date: nsdate_to_iso_string(start_date),
                end_date: nsdate_to_iso_string(end_date),
                calendar_id: nsstring_to_string(calendar_id),
                location: if location != nil { Some(nsstring_to_string(location)) } else { None },
                is_all_day: is_all_day == YES,
            };
            // println!("Processed Event: {:?}", event_info);
            events_vec.push(event_info);
        }
        println!("Finished processing {} events.", events_vec.len());
        Ok(events_vec)
    }
}

#[command]
pub fn get_calendars() -> Result<Vec<CalendarInfo>, String> {
    println!("Fetching calendars... ENTER"); // 1. Entry point
    let _pool = unsafe { NSAutoreleasePool::new(nil) }; // Manage memory
    const EK_ENTITY_TYPE_EVENT: i64 = 0;

    println!("Fetching calendars... Checking auth status"); // 2. Before auth check
    // Check auth status first
    match get_calendar_authorization_status()? {
        CalendarAuthorizationStatus::Authorized => println!("Fetching calendars... Auth status: Authorized"), // 3a. Auth OK
        status => {
            println!("Fetching calendars... Auth status: Not Authorized ({:?})", status); // 3b. Auth Failed
            return Err("Calendar access not authorized.".to_string());
        }
    }

    println!("Fetching calendars... Getting event store instance"); // 4. Before getting store
    let store = get_event_store_instance();
    if store == nil {
        println!("Fetching calendars... ERROR: Event store instance is nil"); // 5a. Store is nil
        return Err("Failed to get EKEventStore instance.".to_string());
    }
    println!("Fetching calendars... Event store instance: {:?}", store); // 5b. Store obtained

    // Equivalent to: [store calendarsForEntityType:EKEntityTypeEvent];
    println!("Fetching calendars... Calling calendarsForEntityType"); // 6. Before msg_send for calendars
    let calendars_nsarray: id = unsafe { msg_send![store, calendarsForEntityType: EK_ENTITY_TYPE_EVENT] };
    println!("Fetching calendars... calendarsForEntityType result: {:?}", calendars_nsarray); // 7. After msg_send

    if calendars_nsarray == nil {
        println!("Fetching calendars... Resulting NSArray is nil, returning empty vec."); // 8a. Array is nil
        return Ok(Vec::new()); // No calendars found or error
    }

    let mut calendars_vec = Vec::new();
    println!("Fetching calendars... Getting calendar count"); // 8b. Before getting count
    let count: NSUInteger = unsafe { NSArray::count(calendars_nsarray) };
    println!("Fetching calendars... Calendar count: {}", count); // 9. After getting count

    for i in 0..count {
        println!("Fetching calendars... LOOP START: Index {}", i); // 10. Loop start
        unsafe {
            println!("Fetching calendars... Getting calendar object at index: {}", i); // 11. Before objectAtIndex
            let calendar: id = NSArray::objectAtIndex(calendars_nsarray, i);
            if calendar == nil {
                println!("Fetching calendars... WARNING: Calendar object at index {} is nil, skipping.", i); // 12a. Calendar object is nil
                continue;
            }
            println!("Fetching calendars... Calendar object: {:?}", calendar); // 12b. Calendar object obtained

            // Get properties
            println!("Fetching calendars... Getting identifier for calendar index: {}", i); // 13. Before identifier msg_send
            let identifier: id = msg_send![calendar, calendarIdentifier];
            println!("Fetching calendars... Identifier object: {:?}", identifier); // 14. After identifier msg_send

            println!("Fetching calendars... Getting title for calendar index: {}", i); // 15. Before title msg_send
            let title: id = msg_send![calendar, title];
            println!("Fetching calendars... Title object: {:?}", title); // 16. After title msg_send

            println!("Fetching calendars... Getting color for calendar index: {}", i); // 17. Before color msg_send
            let color: id = msg_send![calendar, color]; // This is NSColor
            println!("Fetching calendars... Color object: {:?}", color); // 18. After color msg_send

            println!("Fetching calendars... Converting identifier to string for index: {}", i); // 19. Before id conversion
            let identifier_str = nsstring_to_string(identifier);
            println!("Fetching calendars... Converting title to string for index: {}", i); // 20. Before title conversion
            let title_str = nsstring_to_string(title);
            println!("Fetching calendars... Converting color to hex for index: {}", i); // 21. Before color conversion
            let color_hex = nscolor_to_hex(color);

            let calendar_info = CalendarInfo {
                identifier: identifier_str,
                title: title_str,
                color: color_hex,
            };

            println!("Fetching calendars... Parsed CalendarInfo: {:?}", calendar_info); // 22. After parsing
            calendars_vec.push(calendar_info);
            println!("Fetching calendars... LOOP END: Successfully processed calendar index: {}", i); // 23. Loop end for index i
        }
    }
    println!("Fetching calendars... Exiting loop successfully."); // 24. After loop finished

    Ok(calendars_vec) // 25. Returning Ok
}
