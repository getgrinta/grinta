use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{command, Emitter, Listener, Runtime, State, Window};
use tokio::sync::oneshot;

#[allow(non_snake_case)]
#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct SpotlightAppInfo {
    pub path: String,
    pub display_name: String,
    pub content_type: String,
}

// State to store ongoing queries
#[allow(dead_code)]
pub struct SpotlightState {
    queries: Mutex<HashMap<String, Arc<Mutex<Vec<SpotlightAppInfo>>>>>,
}

#[allow(dead_code)]
impl SpotlightState {
    pub fn new() -> Self {
        Self {
            queries: Mutex::new(HashMap::new()),
        }
    }
}
extern "C" {
    static kMDItemPath: id;
    static kMDItemDisplayName: id;
    static kMDItemContentType: id;
}

#[cfg(target_os = "macos")]
#[command]
#[allow(dead_code)]
pub async fn search_spotlight_apps<R: Runtime>(
    window: Window<R>,
    state: State<'_, SpotlightState>,
    query: Option<String>,
    extensions: Vec<String>,
    search_only_in_home: bool,
) -> Result<Vec<SpotlightAppInfo>, String> {
    use cocoa::base::{id, nil, YES};
    use cocoa::foundation::{NSString as CocoaNSString, NSUInteger};
    use objc::{class, msg_send, sel, sel_impl};

    // Generate a unique ID for this query
    let query_id = format!(
        "query_{}",
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis()
    );

    // Create a shared results vector
    let results = Arc::new(Mutex::new(Vec::new()));

    // Store the results in the state
    {
        let mut queries = state.queries.lock().unwrap();
        queries.insert(query_id.clone(), results.clone());
    }

    // Create a oneshot channel to wait for the event
    let (tx, rx) = oneshot::channel();

    // Set up an event listener for the completion event
    let event_name = "spotlight-search-complete";
    let query_id_for_listener = query_id.clone();
    let tx = Arc::new(Mutex::new(Some(tx)));
    let tx_clone = tx.clone();

    let _listener = window.listen(event_name, move |event| {
        // Parse the payload as a string
        let payload_str = event.payload().to_string();
        // Remove quotes if present (JSON string)
        let clean_payload = payload_str.trim_matches('"');
        if clean_payload == query_id_for_listener {
            // Take the sender out of the Option to consume it
            if let Some(sender) = tx_clone.lock().unwrap().take() {
                let _ = sender.send(());
            }
        }
    });

    // Clone the window and query_id for the thread
    let window_clone = window.clone();
    let query_id_clone = query_id.clone();
    let results_clone = results.clone();

    // Spawn a thread to handle the Objective-C run loop
    std::thread::spawn(move || {
        unsafe {
            // Create an autorelease pool
            let pool: id = msg_send![class!(NSAutoreleasePool), new];

            // Create a metadata query
            let query_obj: id = msg_send![class!(NSMetadataQuery), new];

            // Set the search scope to the computer
            let computer_scope: id = msg_send![class!(NSString), stringWithUTF8String:"kMDQueryScopeComputer".as_ptr()];
            let scope_array: id = msg_send![class!(NSMutableArray), array];
            let _: () = msg_send![scope_array, addObject:computer_scope];

            let _: () = msg_send![query_obj, setSearchScopes: scope_array];

            // Set up the predicate
            let search_term = query.as_deref().unwrap_or("");

            // Create the predicate
            let predicate: id = create_spotlight_predicate(search_term, extensions);

            // Set the predicate on the query object
            let _: () = msg_send![query_obj, setPredicate: predicate];

            // Get standard directories using FileManager instead of manually appending paths
            let file_manager: id = msg_send![class!(NSFileManager), defaultManager];

            let user_domain_mask: NSUInteger = 1;

            // Get home directory using homeDirectoryForCurrentUser
            let home_url: id = msg_send![file_manager, homeDirectoryForCurrentUser];
            let home_path: id = msg_send![home_url, path];

            // Create scope array based on search_only_in_home flag
            let scope_array: id = if search_only_in_home {
                let array: id = msg_send![class!(NSMutableArray), arrayWithObject:home_path];
                array
            } else {
                // Get Downloads directory
                let downloads_directory: NSUInteger = 15; // NSDownloadsDirectory
                let downloads_urls: id = msg_send![file_manager, URLsForDirectory:downloads_directory inDomains:user_domain_mask]; // NSUserDomainMask
                let downloads_url: id = msg_send![downloads_urls, firstObject];

                // Get Documents directory
                let documents_directory: NSUInteger = 9; // NSDocumentDirectory
                let documents_urls: id = msg_send![file_manager, URLsForDirectory:documents_directory inDomains:user_domain_mask]; // NSUserDomainMask
                let documents_url: id = msg_send![documents_urls, firstObject];

                // Get Desktop directory
                let desktop_directory: NSUInteger = 12; // NSDesktopDirectory
                let desktop_urls: id = msg_send![file_manager, URLsForDirectory:desktop_directory inDomains:user_domain_mask]; // NSUserDomainMask
                let desktop_url: id = msg_send![desktop_urls, firstObject];

                let downloads_path: id = msg_send![downloads_url, relativePath];
                let documents_path: id = msg_send![documents_url, relativePath];
                let desktop_path: id = msg_send![desktop_url, relativePath];

                // Update the search scopes to include user directories
                let array: id = msg_send![class!(NSMutableArray), arrayWithObject:computer_scope];
                let _: () = msg_send![array, addObject:desktop_path];
                let _: () = msg_send![array, addObject:documents_path];
                let _: () = msg_send![array, addObject:downloads_path];
                array
            };

            // Set the search scopes for the query
            let _: () = msg_send![query_obj, setSearchScopes: scope_array];

            // Set sort descriptors
            let sort_key: id = msg_send![class!(NSString), stringWithUTF8String:"kMDItemDisplayName".as_ptr()];
            let sort_descriptor: id = msg_send![class!(NSSortDescriptor), sortDescriptorWithKey:sort_key ascending:YES];
            let sort_descriptors_array: id =
                msg_send![class!(NSArray), arrayWithObject:sort_descriptor];
            let _: () = msg_send![query_obj, setSortDescriptors:sort_descriptors_array];

            // Set value list attributes
            let value_list_attributes: id = msg_send![class!(NSMutableArray), array];
            let display_name_attr: id = msg_send![class!(NSString), stringWithUTF8String:"kMDItemDisplayName".as_ptr()];
            let path_attr: id = msg_send![class!(NSString), stringWithUTF8String:"kMDItemPath".as_ptr()];
            let content_type_attr: id = msg_send![class!(NSString), stringWithUTF8String:"kMDItemContentType".as_ptr()];
            
            let _: () = msg_send![value_list_attributes, addObject:display_name_attr];
            let _: () = msg_send![value_list_attributes, addObject:path_attr];
            let _: () = msg_send![value_list_attributes, addObject:content_type_attr];

            let _: () = msg_send![query_obj, setValueListAttributes:value_list_attributes];

            // Create a block with captured variables from our context
            let window_for_block = window_clone.clone();
            let query_id_for_block = query_id_clone.clone();
            let results_for_block = results_clone.clone();

            // Use the block API to handle results directly
            let block = block::ConcreteBlock::new(move |notification: id| -> () {

            // Create an autorelease pool
                let pool: id = msg_send![class!(NSAutoreleasePool), new];

                // Get the query object
                let query_obj: id = msg_send![notification, object];

                // Process the results
                let query_results: id = msg_send![query_obj, results];
                let count: usize = msg_send![query_results, count];

                // Store the results
                if let Ok(mut results_vec) = results_for_block.lock() {
                    for i in 0..std::cmp::min(count, 100) {
                        let item: id = msg_send![query_results, objectAtIndex: i];

                        let path_value: id = msg_send![item, valueForAttribute: kMDItemPath];
                        let name_value: id = msg_send![item, valueForAttribute: kMDItemDisplayName];
                        let content_type_value: id =
                            msg_send![item, valueForAttribute: kMDItemContentType];

                        if path_value != nil && name_value != nil && content_type_value != nil {
                            let path_str: *const i8 = msg_send![path_value, UTF8String];
                            let name_str: *const i8 = msg_send![name_value, UTF8String];
                            let content_type_str: *const i8 =
                                msg_send![content_type_value, UTF8String];

                            let path = std::ffi::CStr::from_ptr(path_str)
                                .to_string_lossy()
                                .into_owned();

                            let name = std::ffi::CStr::from_ptr(name_str)
                                .to_string_lossy()
                                .into_owned();

                            let content_type = std::ffi::CStr::from_ptr(content_type_str)
                                .to_string_lossy()
                                .into_owned();

                            results_vec.push(SpotlightAppInfo {
                                path,
                                display_name: name,
                                content_type,
                            });
                        }
                    }
                }

                // Signal completion by emitting event
                let _ =
                    window_for_block.emit("spotlight-search-complete", query_id_for_block.clone());

                let _: () = msg_send![query_obj, stopQuery];
                let _: () = msg_send![pool, drain];
            });

            let block = block.copy();

            // Register for the notification
            let notification_name =
                CocoaNSString::alloc(nil).init_str("NSMetadataQueryDidFinishGatheringNotification");
            let notification_center: id = msg_send![class!(NSNotificationCenter), defaultCenter];

            let _: () = msg_send![notification_center,
                addObserverForName: notification_name
                object: query_obj
                queue: {let main_queue: id = msg_send![class!(NSOperationQueue), mainQueue]; main_queue}
                usingBlock: block
            ];

            // Release the pool
            let _: () = msg_send![pool, drain];

            // Start the query
            let _: () = msg_send![query_obj, startQuery];
            // Run the run loop until the query completes
            let run_loop: id = msg_send![class!(NSRunLoop), currentRunLoop];
            let _: () = msg_send![run_loop, run];
        }
    });

    // Wait for the query to complete
    let _ = rx.await;

    // Get the results
    let results_vec = {
        let mut queries = state.queries.lock().unwrap();
        let results_arc = queries
            .get(&query_id)
            .cloned()
            .unwrap_or_else(|| Arc::new(Mutex::new(Vec::new())));
        queries.remove(&query_id); // Now remove it after we've cloned it
        let results_vec = results_arc.lock().unwrap().clone();
        results_vec
    };

    Ok(results_vec)
}

use cocoa::base::{id, nil};
#[cfg(target_os = "macos")]
fn create_spotlight_predicate(query_text: &str, allowed_extensions: Vec<std::string::String>) -> id {
    use cocoa::foundation::NSString as CocoaNSString;
    use objc::{class, msg_send, sel, sel_impl};

    unsafe {
        // Create an autorelease pool to manage memory
        let pool: id = msg_send![class!(NSAutoreleasePool), new];

        // Create predicates for each allowed extension
        let mut allow_predicates: Vec<id> = Vec::with_capacity(allowed_extensions.len());
        for (_i, ext) in allowed_extensions.iter().enumerate() {
            // Use a simpler predicate format without parameters first
            let format_str = format!("kMDItemDisplayName LIKE[c] '{}'", ext);
            let predicate_str = CocoaNSString::alloc(nil).init_str(&format_str);
            let predicate: id = msg_send![class!(NSPredicate), predicateWithFormat:predicate_str];
            allow_predicates.push(predicate);
        }

        // Create NSArray from the allow_predicates vector
        let count = allow_predicates.len();
        let allow_predicates_array: id =
            msg_send![class!(NSArray), arrayWithObjects:allow_predicates.as_ptr() count:count];

        // Create OR compound predicate for allowed extensions
        let allow_compound_predicate: id = msg_send![
            class!(NSCompoundPredicate),
            orPredicateWithSubpredicates:allow_predicates_array
        ];

        // Create search predicate based on query text
        let search_format = format!("kMDItemDisplayName CONTAINS[cd] '{}'", query_text);
        let search_predicate_str = CocoaNSString::alloc(nil).init_str(&search_format);
        let search_predicate: id =
            msg_send![class!(NSPredicate), predicateWithFormat:search_predicate_str];

        // If we found a folder, it can't have dots
        let folder_format =
            "kMDItemContentType == 'public.folder' AND NOT (kMDItemDisplayName CONTAINS[cd] '.')";
        let folder_predicate_str = CocoaNSString::alloc(nil).init_str(folder_format);
        let folder_predicate: id =
            msg_send![class!(NSPredicate), predicateWithFormat:folder_predicate_str];

        // Create OR compound predicate for extensions or folders
        let extensions_or_folder_predicates = [allow_compound_predicate, folder_predicate];
        let extensions_or_folder_array: id = msg_send![class!(NSArray), arrayWithObjects:extensions_or_folder_predicates.as_ptr() count:2];
        let extensions_or_folder_predicate: id = msg_send![
            class!(NSCompoundPredicate),
            orPredicateWithSubpredicates:extensions_or_folder_array
        ];

        // Create exclude system file predicate
        let exclude_system_format = "NOT (kMDItemSupportFileType == 'MDSystemFile')";
        let exclude_system_predicate_str =
            CocoaNSString::alloc(nil).init_str(exclude_system_format);
        let exclude_system_file_predicate: id =
            msg_send![class!(NSPredicate), predicateWithFormat:exclude_system_predicate_str];

        // Create final AND compound predicate
        let final_predicates = [
            search_predicate,
            extensions_or_folder_predicate,
            exclude_system_file_predicate,
        ];
        let final_array: id = msg_send![
            class!(NSArray),
            arrayWithObjects:final_predicates.as_ptr() count:3
        ];

        let final_predicate: id = msg_send![
            class!(NSCompoundPredicate),
            andPredicateWithSubpredicates:final_array
        ];

        // Try to retain the predicate to prevent it from being released too early
        let _: () = msg_send![final_predicate, retain];

        // Release the autorelease pool
        let _: () = msg_send![pool, drain];

        final_predicate
    }
}

#[cfg(not(target_os = "macos"))]
#[command]
pub async fn search_spotlight_apps<R: Runtime>(
    _window: Window<R>,
    _state: State<'_, SpotlightState>,
    _query: Option<String>,
    _extensions: Vec<String>,
) -> Result<Vec<SpotlightAppInfo>, String> {
    Err("Spotlight search is only available on macOS".to_string())
}
