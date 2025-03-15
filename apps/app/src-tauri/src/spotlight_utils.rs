use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::{command, Runtime, State, Window, Manager, Listener, Emitter};
use tokio::sync::oneshot;
use std::time::{SystemTime, UNIX_EPOCH};
use std::os::raw::c_void;

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct SpotlightAppInfo {
    pub path: String,
    pub display_name: String,
    pub content_type: String,
}

// State to store ongoing queries
pub struct SpotlightState {
    queries: Mutex<HashMap<String, Arc<Mutex<Vec<SpotlightAppInfo>>>>>,
}

impl SpotlightState {
    pub fn new() -> Self {
        Self {
            queries: Mutex::new(HashMap::new()),
        }
    }
}

#[cfg(target_os = "macos")]
#[command]
pub async fn search_spotlight_apps<R: Runtime>(
    window: Window<R>,
    state: State<'_, SpotlightState>,
    query: Option<String>
) -> Result<Vec<SpotlightAppInfo>, String> {
    use cocoa::base::{id, nil, selector, YES, NO};
    use cocoa::foundation::{NSArray, NSString as CocoaNSString};
    use objc::runtime::{Object, Sel, Class};
    use objc::{class, msg_send, sel, sel_impl};
    
    // Generate a unique ID for this query
    let query_id = format!("query_{}", 
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
            let scope_array: id = msg_send![class!(NSArray), arrayWithObject: 
                CocoaNSString::alloc(nil).init_str("kMDQueryScopeComputer")];
            let _: () = msg_send![query_obj, setSearchScopes: scope_array];
            
            // Set up the predicate
            let search_term = query.as_deref().unwrap_or("");
            
            // Create a pool for this operation
            let pool: id = msg_send![class!(NSAutoreleasePool), new];
            
            // Create the predicate
            let predicate: id = create_spotlight_predicate(search_term);
            
            // Set the predicate on the query object
            let _: () = msg_send![query_obj, setPredicate: predicate];
            
            // Release the pool
            let _: () = msg_send![pool, drain];
            
            // Create a block with captured variables from our context
            let window_for_block = window_clone.clone();
            let query_id_for_block = query_id_clone.clone();
            let results_for_block = results_clone.clone();
            
            // Use the block API to handle results directly
            let block = block::ConcreteBlock::new(move |notification: id| -> () {
                // Get the query object
                let query_obj: id = msg_send![notification, object];
                
                // Process the results
                let query_results: id = msg_send![query_obj, results];
                let count: usize = msg_send![query_results, count];
                
                // Store the results
                if let Ok(mut results_vec) = results_for_block.lock() {
                    for i in 0..count {
                        let item: id = msg_send![query_results, objectAtIndex: i];
                        
                        let path_attr = CocoaNSString::alloc(nil).init_str("kMDItemPath");
                        let name_attr = CocoaNSString::alloc(nil).init_str("kMDItemDisplayName");
                        let content_type_attr = CocoaNSString::alloc(nil).init_str("kMDItemContentType");
                        
                        let path_value: id = msg_send![item, valueForAttribute: path_attr];
                        let name_value: id = msg_send![item, valueForAttribute: name_attr];
                        let content_type_value: id = msg_send![item, valueForAttribute: content_type_attr];
                        
                        if path_value != nil && name_value != nil && content_type_value != nil {
                            let path_str: *const i8 = msg_send![path_value, UTF8String];
                            let name_str: *const i8 = msg_send![name_value, UTF8String];
                            let content_type_str: *const i8 = msg_send![content_type_value, UTF8String];
                            
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
                let _ = window_for_block.emit("spotlight-search-complete", query_id_for_block.clone());


                let _: () = msg_send![query_obj, stopQuery];
            });
            
            let block = block.copy();
            
            // Register for the notification
            let notification_name = CocoaNSString::alloc(nil).init_str("NSMetadataQueryDidFinishGatheringNotification");
            let notification_center: id = msg_send![class!(NSNotificationCenter), defaultCenter];
            
            let _: () = msg_send![notification_center, 
                addObserverForName: notification_name
                object: query_obj
                queue: {let main_queue: id = msg_send![class!(NSOperationQueue), mainQueue]; main_queue}
                usingBlock: block
            ];
            
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
        let results_arc = queries.get(&query_id).cloned().unwrap_or_else(|| Arc::new(Mutex::new(Vec::new())));
        queries.remove(&query_id); // Now remove it after we've cloned it
        let results_vec = results_arc.lock().unwrap().clone();
        results_vec
    };
    
    Ok(results_vec)
}

use cocoa::base::{id, nil};
#[cfg(target_os = "macos")]
fn create_spotlight_predicate(query_text: &str) -> id {
    use cocoa::foundation::{NSArray, NSString as CocoaNSString};
    use objc::{class, msg_send, sel, sel_impl};

    unsafe {
        // Create an autorelease pool to manage memory
        let pool: id = msg_send![class!(NSAutoreleasePool), new];
        
        // Define allowed extensions
        let allowed_extensions = [
            "*.txt", "*.pdf", "*.xls", "*.xlsx", "*.doc", "*.docx", 
            "*.ppt", "*.pptx", "*.zip", "*.rar", "*.7z", "*.md",
            "*.gsheet", "*.gdoc", "*.gslides", "*.drawio", "*.odp",

            // Ebooks
            "*.epub, *.mobi, *.djvu",
        ];

        // Create predicates for each allowed extension
        let mut allow_predicates: Vec<id> = Vec::with_capacity(allowed_extensions.len());
        for (i, ext) in allowed_extensions.iter().enumerate() {
            // Use a simpler predicate format without parameters first
            let format_str = format!("kMDItemDisplayName LIKE[c] '{}'", ext);
            let predicate_str = CocoaNSString::alloc(nil).init_str(&format_str);
            let predicate: id = msg_send![class!(NSPredicate), predicateWithFormat:predicate_str];
            allow_predicates.push(predicate);
        }

        // Create NSArray from the allow_predicates vector
        let count = allow_predicates.len();
        let allow_predicates_array: id = msg_send![class!(NSArray), arrayWithObjects:allow_predicates.as_ptr() count:count];

        // Create OR compound predicate for allowed extensions
        let allow_compound_predicate: id = msg_send![
            class!(NSCompoundPredicate), 
            orPredicateWithSubpredicates:allow_predicates_array
        ];

        // Create search predicate based on query text
        let search_format = format!("kMDItemDisplayName CONTAINS[cd] '{}'", query_text);
        let search_predicate_str = CocoaNSString::alloc(nil).init_str(&search_format);
        let search_predicate: id = msg_send![class!(NSPredicate), predicateWithFormat:search_predicate_str];

        // If we found a folder, it can't have dots
        let folder_format = "kMDItemContentType == 'public.folder' AND NOT (kMDItemDisplayName CONTAINS[cd] '.')";
        let folder_predicate_str = CocoaNSString::alloc(nil).init_str(folder_format);
        let folder_predicate: id = msg_send![class!(NSPredicate), predicateWithFormat:folder_predicate_str];

        // Create OR compound predicate for extensions or folders
        let extensions_or_folder_predicates = [allow_compound_predicate, folder_predicate];
        let extensions_or_folder_array: id = msg_send![class!(NSArray), arrayWithObjects:extensions_or_folder_predicates.as_ptr() count:2];
        let extensions_or_folder_predicate: id = msg_send![
            class!(NSCompoundPredicate), 
            orPredicateWithSubpredicates:extensions_or_folder_array
        ];

        // Create exclude system file predicate
        let exclude_system_format = "NOT (kMDItemSupportFileType == 'MDSystemFile')";
        let exclude_system_predicate_str = CocoaNSString::alloc(nil).init_str(exclude_system_format);
        let exclude_system_file_predicate: id = msg_send![class!(NSPredicate), predicateWithFormat:exclude_system_predicate_str];

        // Create AND compound predicate for excluding directories
        let exclude_directories_array: id = msg_send![class!(NSArray), arrayWithObject:exclude_system_file_predicate];
        let exclude_directories_predicate: id = msg_send![
            class!(NSCompoundPredicate), 
            andPredicateWithSubpredicates:exclude_directories_array
        ];

        // Create final AND compound predicate
        let final_predicates = [search_predicate, extensions_or_folder_predicate, exclude_system_file_predicate];
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
        
        // Make a copy of the predicate to ensure it's not released
        let copied_predicate: id = msg_send![final_predicate, copy];
        
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
    _query: Option<String>
) -> Result<Vec<SpotlightAppInfo>, String> {
    Err("Spotlight search is only available on macOS".to_string())
}
