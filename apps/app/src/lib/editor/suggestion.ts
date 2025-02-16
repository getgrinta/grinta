import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

const suggestionPluginKey = new PluginKey("textSuggestion");

// This helper will create (or clear) a widget decoration displaying the suggestion.
function createSuggestionDecoration(from, suggestionText) {
	return Decoration.widget(
		from,
		() => {
			const span = document.createElement("span");
			span.className = "inline-suggestion";
			// style the suggested text as grey
			span.style.opacity = 0.5;
			span.style.pointerEvents = "none";
			span.textContent = suggestionText;
			return span;
		},
		{ side: 1 },
	);
}

export const TextSuggestion = Extension.create({
	name: "textSuggestion",

	addProseMirrorPlugins() {
		const fetchAutocompletion = this.options.fetchAutocompletion;

		return [
			new Plugin({
				key: suggestionPluginKey,
				state: {
					init() {
						return { deco: DecorationSet.empty, suggestion: null, query: "" };
					},
					apply(tr, pluginState) {
						const meta = tr.getMeta(suggestionPluginKey);
						if (meta) {
							return meta;
						}
						// On document changes, reset stored query.
						if (tr.docChanged) {
							return { deco: DecorationSet.empty, suggestion: null, query: "" };
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
					let debounceTimer;
					let lastQuery = "";
					let inputByMouse = false;
					let navigationByArrow = false;
					let lastKeyWasBackspace = false;
					const editorDOM = view.dom;

					const onMouseDown = () => {
						inputByMouse = true;
					};

					const onKeyDown = (e) => {
						if (e.key === "ArrowUp" || e.key === "ArrowDown") {
							navigationByArrow = true;
						} else {
							navigationByArrow = false;
						}

						if (e.key === "Backspace") {
							lastKeyWasBackspace = true;
						} else {
							lastKeyWasBackspace = false;
						}
						// Clear mouse flag on any key press.
						inputByMouse = false;
					};

					editorDOM.addEventListener("mousedown", onMouseDown);
					editorDOM.addEventListener("keydown", onKeyDown);

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

							// Process only when the selection is collapsed.
							if (!state.selection.empty) return;

							// Prevent suggestions when navigating by arrow keys.
							if (navigationByArrow) {
								if (debounceTimer) {
									clearTimeout(debounceTimer);
									debounceTimer = null;
								}
								view.dispatch(
									state.tr.setMeta(suggestionPluginKey, {
										deco: DecorationSet.empty,
										suggestion: null,
										query: "",
									}),
								);
								return;
							}

							// Only trigger suggestions if the cursor is at the end of its parent node.
							const { $from } = state.selection;
							if ($from.pos !== $from.end()) {
								if (debounceTimer) {
									clearTimeout(debounceTimer);
									debounceTimer = null;
								}
								view.dispatch(
									state.tr.setMeta(suggestionPluginKey, {
										deco: DecorationSet.empty,
										suggestion: null,
										query: "",
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
									debounceTimer = null;
								}
								lastQuery = "";
								view.dispatch(
									state.tr.setMeta(suggestionPluginKey, {
										deco: DecorationSet.empty,
										suggestion: null,
										query: "",
									}),
								);
								return;
							}

							// When backspace was pressed and the query hasn’t changed, clear suggestions.
							if (lastKeyWasBackspace && query === lastQuery) {
								if (debounceTimer) {
									clearTimeout(debounceTimer);
									debounceTimer = null;
								}
								view.dispatch(
									state.tr.setMeta(suggestionPluginKey, {
										deco: DecorationSet.empty,
										suggestion: null,
										query: "",
									}),
								);
								return;
							}

							// Only fetch if the query has changed.
							if (query === lastQuery) return;
							lastQuery = query;

							if (debounceTimer) clearTimeout(debounceTimer);
							debounceTimer = setTimeout(async () => {
								const suggestion = await fetchAutocompletion(query);
								let deco = DecorationSet.empty;
								if (suggestion && suggestion.length > 0) {
									const pos = view.state.selection.$from.pos;
									const widget = createSuggestionDecoration(pos, suggestion);
									deco = DecorationSet.create(view.state.doc, [widget]);
								}
								view.dispatch(
									view.state.tr.setMeta(suggestionPluginKey, {
										deco,
										suggestion,
										pos: view.state.selection.$from.pos,
										query,
									}),
								);
							}, 500);
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
			// Handle Tab key to accept suggestion
			"Mod-l": () => {
				const { state, view } = this.editor;
				const pluginState = suggestionPluginKey.getState(state);

				// Check if there is a suggestion available
				if (pluginState?.suggestion) {
					const { pos, suggestion } = pluginState;

					// Insert the suggested text at the cursor position
					view.dispatch(state.tr.insertText(suggestion, pos, pos));

					// Clear the suggestion after accepting it
					view.dispatch(
						state.tr.setMeta(suggestionPluginKey, {
							deco: DecorationSet.empty,
							suggestion: null,
						}),
					);

					return true; // Prevent default Tab behavior
				}

				return false; // Allow default behavior if no suggestion exists
			},

			// Handle Escape key to reject suggestion
			Escape: () => {
				const { state, view } = this.editor;

				// Clear any existing suggestion
				view.dispatch(
					state.tr.setMeta(suggestionPluginKey, {
						deco: DecorationSet.empty,
						suggestion: null,
					}),
				);

				return true; // Prevent default behavior
			},
		};
	},
});
