import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

const suggestionPluginKey = new PluginKey("textSuggestion");

// This helper will create (or clear) a widget decoration displaying the suggestion.
function createSuggestionDecoration(
	from: number,
	suggestionText: string,
	isLoading = false,
) {
	return Decoration.widget(
		from,
		() => {
			const span = document.createElement("span");
			span.className = isLoading
				? "inline-suggestion-loading"
				: "inline-suggestion";
			span.style.opacity = "0.5";
			span.style.pointerEvents = "none";
			span.textContent = isLoading ? "" : suggestionText;

			if (isLoading) {
				// Add subtle animation for loading state
				span.style.animation = "pulse 1.5s infinite ease-in-out";
			}

			return span;
		},
		{ side: 1 },
	);
}

export const TextSuggestion = Extension.create({
	name: "textSuggestion",

	addProseMirrorPlugins() {
		const fetchAutocompletion = this.options.fetchAutocompletion;
		// Track if content update was triggered by filesystem watcher
		let isExternalUpdate = false;

		return [
			new Plugin({
				key: suggestionPluginKey,
				state: {
					init() {
						return {
							deco: DecorationSet.empty,
							suggestion: null,
							query: "",
							isLoading: false,
							cursorPos: null,
						};
					},
					apply(tr, pluginState) {
						const meta = tr.getMeta(suggestionPluginKey);
						if (meta) {
							// If we're preserving cursor position during updates
							if (meta.preserveCursor && pluginState.cursorPos) {
								return {
									...meta,
									cursorPos: pluginState.cursorPos,
								};
							}
							return meta;
						}

						// When doc changes but not by user input (external update)
						if (tr.docChanged && isExternalUpdate) {
							// Preserve existing suggestion and cursor position
							return {
								...pluginState,
								// Only reset suggestion if cursor position changed significantly
								...(tr.selectionSet
									? {
											deco: DecorationSet.empty,
											suggestion: null,
											query: "",
										}
									: {}),
							};
						}

						// On regular document changes, reset stored query.
						if (tr.docChanged && !isExternalUpdate) {
							return {
								deco: DecorationSet.empty,
								suggestion: null,
								query: "",
								isLoading: false,
								cursorPos: null,
							};
						}

						// Save cursor position on selection changes
						if (tr.selectionSet) {
							return {
								...pluginState,
								cursorPos: tr.selection.$from.pos,
							};
						}

						return pluginState;
					},
				},
				props: {
					decorations(state) {
						return suggestionPluginKey.getState(state).deco;
					},
				},
				view: (view) => {
					let debounceTimer: number | Timer | undefined;
					let lastQuery = "";
					let _inputByMouse = false;
					let navigationByArrow = false;
					let lastKeyWasBackspace = false;
					const editorDOM = view.dom;

					const onMouseDown = () => {
						_inputByMouse = true;
					};

					// Helper function to accept suggestion
					const acceptSuggestion = () => {
						const { state, view } = this.editor;
						const pluginState = suggestionPluginKey.getState(state);

						// Check if there is a suggestion available
						if (pluginState?.suggestion) {
							const { pos, suggestion } = pluginState;

							// Calculate the new cursor position after insertion
							const newPos = pos + suggestion.length;

							// Create a single transaction that does both operations
							const tr = state.tr
								.insertText(suggestion, pos, pos)
								.setMeta(suggestionPluginKey, {
									deco: DecorationSet.empty,
									suggestion: null,
									isLoading: false,
								});

							// Apply the transaction
							view.dispatch(tr);

							// Set selection to the end of the inserted text
							const newState = view.state;
							const newSelection = TextSelection.create(newState.doc, newPos);
							view.dispatch(newState.tr.setSelection(newSelection));

							// Focus immediately
							view.focus();

							return true;
						}
						return false;
					};

					const onKeyDown = (e: KeyboardEvent) => {
						if (e.key === "ArrowUp" || e.key === "ArrowDown") {
							navigationByArrow = true;
						} else {
							navigationByArrow = false;
						}

						// Tab key to accept suggestion
						if (e.key === "Tab") {
							e.preventDefault();
							e.stopPropagation();
							return acceptSuggestion();
						}

						// Right arrow at end of line to accept suggestion
						if (e.key === "ArrowRight") {
							const { state } = this.editor;
							const { selection } = state;
							const pluginState = suggestionPluginKey.getState(state);

							// Only accept if we're at the end of the current node
							if (
								pluginState?.suggestion &&
								selection.$from.pos === selection.$from.end()
							) {
								e.preventDefault();
								e.stopPropagation();
								return acceptSuggestion();
							}
						}

						if (e.key === "Backspace") {
							lastKeyWasBackspace = true;
						} else {
							lastKeyWasBackspace = false;
						}
						// Clear mouse flag on any key press.
						_inputByMouse = false;
					};

					editorDOM.addEventListener("mousedown", onMouseDown);
					editorDOM.addEventListener("keydown", onKeyDown);

					// Track if content is being updated from external source
					const trackExternalUpdates = () => {
						// Listen for transaction dispatch events
						const originalDispatch = view.dispatch;
						view.dispatch = (transaction) => {
							// Check if this is an external update (content setting from outside)
							if (
								transaction.docChanged &&
								transaction.getMeta("preventSuggestionReset")
							) {
								isExternalUpdate = true;

								// Preserve cursor position from plugin state
								const pluginState = suggestionPluginKey.getState(view.state);
								if (pluginState?.cursorPos) {
									const updatedTransaction = transaction.setMeta(
										suggestionPluginKey,
										{
											preserveCursor: true,
										},
									);

									// Call original dispatch
									originalDispatch.call(view, updatedTransaction);
								} else {
									// Call original dispatch
									originalDispatch.call(view, transaction);
								}

								// Reset flag after dispatch
								setTimeout(() => {
									isExternalUpdate = false;
								}, 10);
							} else {
								originalDispatch.call(view, transaction);
							}
						};
					};

					trackExternalUpdates();

					return {
						async update(view, prevState) {
							const { state } = view;

							// Guard: do not process if the update was triggered by our own meta transaction.
							if (
								prevState?.doc.eq(state.doc) &&
								prevState.selection.eq(state.selection)
							) {
								return;
							}

							// Skip suggestion processing if this is an external update
							if (isExternalUpdate) return;

							// Clear suggestion if cursor position changed without text changes
							if (
								prevState?.doc.eq(state.doc) &&
								!prevState.selection.eq(state.selection)
							) {
								view.dispatch(
									state.tr.setMeta(suggestionPluginKey, {
										deco: DecorationSet.empty,
										suggestion: null,
										query: "",
										isLoading: false,
									}),
								);
								return;
							}

							// Process only when the selection is collapsed.
							if (!state.selection.empty) return;

							// Prevent suggestions when navigating by arrow keys.
							if (navigationByArrow) {
								if (debounceTimer) {
									clearTimeout(debounceTimer);
									debounceTimer = undefined;
								}
								view.dispatch(
									state.tr.setMeta(suggestionPluginKey, {
										deco: DecorationSet.empty,
										suggestion: null,
										query: "",
										isLoading: false,
									}),
								);
								return;
							}

							// Only trigger suggestions if the cursor is at the end of its parent node.
							const { $from } = state.selection;
							if ($from.pos !== $from.end()) {
								if (debounceTimer) {
									clearTimeout(debounceTimer);
									debounceTimer = undefined;
								}
								view.dispatch(
									state.tr.setMeta(suggestionPluginKey, {
										deco: DecorationSet.empty,
										suggestion: null,
										query: "",
										isLoading: false,
									}),
								);
								return;
							}

							const blockStart = $from.start();
							const query = state.doc.textBetween(blockStart, $from.pos, " ");

							// If the current paragraph is empty, clear suggestions.
							if (!query.trim()) {
								if (debounceTimer) {
									clearTimeout(debounceTimer);
									debounceTimer = undefined;
								}
								lastQuery = "";
								view.dispatch(
									state.tr.setMeta(suggestionPluginKey, {
										deco: DecorationSet.empty,
										suggestion: null,
										query: "",
										isLoading: false,
									}),
								);
								return;
							}

							// When backspace was pressed and the query hasn't changed, clear suggestions.
							if (lastKeyWasBackspace && query === lastQuery) {
								if (debounceTimer) {
									clearTimeout(debounceTimer);
									debounceTimer = undefined;
								}
								view.dispatch(
									state.tr.setMeta(suggestionPluginKey, {
										deco: DecorationSet.empty,
										suggestion: null,
										query: "",
										isLoading: false,
									}),
								);
								return;
							}

							// Only fetch if the query has changed and has at least 3 characters
							if (query === lastQuery) return;

							// Don't trigger suggestions for very short text
							if (query.trim().length < 3) return;

							lastQuery = query;

							if (debounceTimer) clearTimeout(debounceTimer);

							// Show loading state
							const pos = view.state.selection.$from.pos;
							const loadingWidget = createSuggestionDecoration(pos, "", true);
							const loadingDeco = DecorationSet.create(view.state.doc, [
								loadingWidget,
							]);

							view.dispatch(
								view.state.tr.setMeta(suggestionPluginKey, {
									deco: loadingDeco,
									suggestion: null,
									query,
									isLoading: true,
								}),
							);

							debounceTimer = setTimeout(async () => {
								try {
									const suggestion = await fetchAutocompletion({
										query,
									});

									let deco = DecorationSet.empty;

									if (suggestion && suggestion.length > 0) {
										const pos = view.state.selection.$from.pos;
										const widget = createSuggestionDecoration(pos, suggestion);
										deco = DecorationSet.create(view.state.doc, [widget]);
									}

									view.dispatch(
										view.state.tr.setMeta(suggestionPluginKey, {
											deco,
											suggestion: suggestion ? `${suggestion} ` : null,
											pos: view.state.selection.$from.pos,
											query,
											isLoading: false,
										}),
									);
								} catch (error) {
									// Clear loading state on error
									view.dispatch(
										view.state.tr.setMeta(suggestionPluginKey, {
											deco: DecorationSet.empty,
											suggestion: null,
											query,
											isLoading: false,
										}),
									);
									console.error("Error fetching suggestion:", error);
								}
							}, 400); // Reduced debounce time for better responsiveness
						},
						destroy() {
							if (debounceTimer) clearTimeout(debounceTimer);
							editorDOM.removeEventListener("mousedown", onMouseDown);
							editorDOM.removeEventListener("keydown", onKeyDown);
						},
					};
				},
			}),
		];
	},

	addKeyboardShortcuts() {
		return {
			// Handle Escape key to reject suggestion and blur editor
			Escape: () => {
				const { state, view } = this.editor;
				const pluginState = suggestionPluginKey.getState(state);

				if (pluginState?.suggestion) {
					// Clear any existing suggestion
					view.dispatch(
						state.tr.setMeta(suggestionPluginKey, {
							deco: DecorationSet.empty,
							suggestion: null,
							isLoading: false,
						}),
					);
					return true;
				}
				// If no suggestion exists, blur the editor
				(view.dom as HTMLElement).blur();
				return true;
			},
		};
	},
});
