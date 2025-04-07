import { goto } from "$app/navigation";
import { watch } from "@tauri-apps/plugin-fs";
import { fetch } from "@tauri-apps/plugin-http";
import { openUrl } from "@tauri-apps/plugin-opener";
import { exit } from "@tauri-apps/plugin-process";
import { Command } from "@tauri-apps/plugin-shell";
import nlp from "compromise";
import dates from "compromise-dates";
import numbers from "compromise-numbers";
import { matchSorter } from "match-sorter";
import { sortBy, uniq } from "rambda";
import { _ } from "svelte-i18n";
import { toast } from "svelte-sonner";
import { get } from "svelte/store";
import { P, match } from "ts-pattern";
import { z } from "zod";
import {
	type ExecutableCommand,
	COMMAND_HANDLER,
	ExecutableCommandSchema,
	type CommandHandler,
	APP_MODE,
	HOSTNAME_REGEX,
	COMMAND_PRIORITY,
} from "@getgrinta/core";
import { type PluginContext } from "@getgrinta/plugin"
import { PluginWebSearch, PluginNotes, PluginNlp, PluginExactUrl } from "@getgrinta/plugin-search"
import { searchSpotlightApps, toggleVisibility } from "../grinta-invoke";
import { appMetadataStore } from "../store/app-metadata.svelte";
import {
	type FileEntry,
	findApps,
	generateCancellationToken,
} from "../utils.svelte";
import { appStore } from "./app.svelte";
import { clipboardStore } from "./clipboard.svelte";
import { notesStore } from "./notes.svelte";
import { SecureStore } from "./secure.svelte";
import { settingsStore } from "./settings.svelte";
import debounce from "debounce";
import { vaultStore } from "./vault.svelte";

nlp.extend(dates);
nlp.extend(numbers);

function t(key: string, params: Record<string, string> = {}) {
	try {
		const translationFn = get(_);
		return translationFn(key, { values: params });
	} catch {
		return key;
	}
}

export const SYSTEM_COMMAND = {
	SIGN_IN: "SIGN_IN",
	PROFILE: "PROFILE",
	CLEAR_NOTES: "CLEAR_NOTES",
	CLEAR_HISTORY: "CLEAR_HISTORY",
	HELP: "HELP",
	SETTINGS: "SETTINGS",
	EXIT: "EXIT",
	CLIPBOARD: "CLIPBOARD",
} as const;

export type SystemCommand = keyof typeof SYSTEM_COMMAND;

type HistoryEntry = Omit<ExecutableCommand, "label">;

async function buildAppCommands(
	apps: FileEntry[],
): Promise<ExecutableCommand[]> {
	return apps.map((app) => {
		const defaultName = app.name.slice(0, -4);
		const localizedName =
			appMetadataStore.getLocalizedName(defaultName) ?? defaultName;

		return ExecutableCommandSchema.parse({
			label: defaultName,
			localizedLabel: localizedName,
			value: app.name,
			metadata: {
				path: app.path,
			},
			handler: COMMAND_HANDLER.APP,
			priority: COMMAND_PRIORITY.HIGH,
			appModes: [APP_MODE.INITIAL],
		});
	});
}

function buildShortcutCommands(stdout: string) {
	const shortcuts = stdout.split(/\r?\n/);
	return shortcuts.map((shortcut) =>
		ExecutableCommandSchema.parse({
			label: shortcut,
			localizedLabel: shortcut,
			value: shortcut,
			handler: COMMAND_HANDLER.RUN_SHORTCUT,
			priority: COMMAND_PRIORITY.HIGH,
			appModes: [APP_MODE.INITIAL],
		}),
	);
}

const CommandsSchema = z.object({
	commandHistory: z.array(ExecutableCommandSchema).default([]),
});

export type Commands = z.infer<typeof CommandsSchema>;

export class CommandsStore extends SecureStore<Commands> {
	commands = $state<ExecutableCommand[]>([]);
	buildCommandsToken = $state<string>("");
	spotlightSearchToken = $state<string>("");
	selectedIndex = $state<number>(0);
	currentCommand = $derived<ExecutableCommand>(
		this.commands[this.selectedIndex],
	);
	installedApps = $state<FileEntry[]>([]);
	appCommands = $state<ExecutableCommand[]>([]);
	shortcutCommands = $state<ExecutableCommand[]>([]);
	webSearchCommands = $state<ExecutableCommand[]>([]);
	spotlightCommands = $state<ExecutableCommand[]>([]);
	isUpdatingExternalSource = $state<boolean>(false);
	scrollTop = $state<number>(0);

	private debouncedSpotlightSearch = debounce(() => {
		this.startSpotlightSearch();
	}, 400);

	// Ensure we have a valid commandHistory even before initialization
	get commandHistory(): ExecutableCommand[] {
		return this.data?.commandHistory || [];
	}

	getMenuItems(): ExecutableCommand[] {
		const userCommands =
			vaultStore.data.authCookie?.length > 0
				? [
						ExecutableCommandSchema.parse({
							label: t("commands.menuItems.profile"),
							localizedLabel: t("commands.menuItems.profile"),
							value: SYSTEM_COMMAND.PROFILE,
							handler: COMMAND_HANDLER.SYSTEM,
							appModes: [APP_MODE.MENU],
						}),
					]
				: [
						ExecutableCommandSchema.parse({
							label: t("commands.menuItems.signIn"),
							localizedLabel: t("commands.menuItems.signIn"),
							value: SYSTEM_COMMAND.SIGN_IN,
							handler: COMMAND_HANDLER.SYSTEM,
							appModes: [APP_MODE.MENU],
						}),
					];
		return [
			...userCommands,
			...(settingsStore.data?.clipboardRecordingEnabled
				? [
						ExecutableCommandSchema.parse({
							label: t("commands.menuItems.clipboardHistory"),
							localizedLabel: t("commands.menuItems.clipboardHistory"),
							value: SYSTEM_COMMAND.CLIPBOARD,
							handler: COMMAND_HANDLER.SYSTEM,
							appModes: [APP_MODE.MENU],
						}),
					]
				: []),
			ExecutableCommandSchema.parse({
				label: t("commands.menuItems.clearNotes"),
				localizedLabel: t("commands.menuItems.clearNotes"),
				value: SYSTEM_COMMAND.CLEAR_NOTES,
				handler: COMMAND_HANDLER.SYSTEM,
				appModes: [APP_MODE.MENU],
			}),
			ExecutableCommandSchema.parse({
				label: t("commands.menuItems.clearHistory"),
				localizedLabel: t("commands.menuItems.clearHistory"),
				value: SYSTEM_COMMAND.CLEAR_HISTORY,
				handler: COMMAND_HANDLER.SYSTEM,
				appModes: [APP_MODE.MENU],
			}),
			ExecutableCommandSchema.parse({
				label: t("commands.menuItems.help"),
				localizedLabel: t("commands.menuItems.help"),
				value: SYSTEM_COMMAND.HELP,
				handler: COMMAND_HANDLER.SYSTEM,
				appModes: [APP_MODE.MENU],
			}),
			ExecutableCommandSchema.parse({
				label: t("commands.menuItems.settings"),
				localizedLabel: t("commands.menuItems.settings"),
				value: SYSTEM_COMMAND.SETTINGS,
				handler: COMMAND_HANDLER.SYSTEM,
				appModes: [APP_MODE.MENU],
			}),
			ExecutableCommandSchema.parse({
				label: t("commands.menuItems.exit"),
				localizedLabel: t("commands.menuItems.exit"),
				value: SYSTEM_COMMAND.EXIT,
				handler: COMMAND_HANDLER.SYSTEM,
				appModes: [APP_MODE.MENU],
			}),
		];
	}

	getClipboardCommands(): ExecutableCommand[] {
		return clipboardStore.data.clipboardHistory
			.filter((clipboardEntry) => clipboardEntry.trim().length > 0)
			.reverse()
			.map((clipboardEntry) =>
				ExecutableCommandSchema.parse({
					label: clipboardEntry,
					localizedLabel: clipboardEntry,
					value: clipboardEntry,
					handler: COMMAND_HANDLER.COPY_TO_CLIPBOARD,
					appModes: [APP_MODE.INITIAL, APP_MODE.CLIPBOARD],
				}),
			);
	}

	async initialize() {
		try {
			// First restore data to ensure we have valid commandHistory
			await this.restore();

			// Then build commands
			await this.buildAppCommands();
			await this.buildShortcutCommands();
		} catch (error) {
			console.error("Error initializing CommandsStore:", error);
		}

		this.watchForApplicationChanges();

		setInterval(() => {
			this.buildShortcutCommands();
		}, 10_000);
	}

	private async buildShortcutCommands() {
		const availableShortcuts = await Command.create("shortcuts", [
			"list",
		]).execute();
		this.shortcutCommands = buildShortcutCommands(availableShortcuts.stdout);
	}

	async buildAppCommands() {
		const apps = await findApps();
		this.installedApps = apps;
		this.appCommands = await buildAppCommands(this.installedApps);
	}

	async watchForApplicationChanges() {
		await watch(
			"/Applications/",
			(event) => {
				if (
					event.paths.length === 1 &&
					event.paths[0] === "/Applications/.DS_Store"
				) {
					return;
				}
				if (event.paths.every((path) => !path.endsWith(".app"))) {
					return;
				}

				(async () => {
					await this.buildAppCommands();
				})();
			},
			{ recursive: false },
		);
	}

	async buildCommands({
		isRefresh = false,
	}: {
		isRefresh: boolean;
	}) {
		this.selectedIndex = 0;
		const queryIsUrl = HOSTNAME_REGEX.test(appStore.query);
		const newCommandsToken = generateCancellationToken();
		this.buildCommandsToken = newCommandsToken;

		let commands: ExecutableCommand[] = await match(appStore.appMode)
			.with(APP_MODE.INITIAL, async () => {
				let commandHistory = this.commandHistory
					.slice()
					.reverse()
				if (appStore.query.length === 0) {
					return commandHistory;
				}

				// Filter out commands of the same url as the current query
				if (queryIsUrl) {
					commandHistory = commandHistory.filter(
						(a) =>
							a.label !== appStore.query && a.handler !== COMMAND_HANDLER.URL,
					);
				}

				const exactUrlCommands = await PluginExactUrl(this.buildPluginContext())?.addSearchResults?.(appStore.query) ?? [];

				return [
					...this.appCommands,
					...exactUrlCommands,
					...this.webSearchCommands,
					...this.spotlightCommands,
					...commandHistory,
					...this.shortcutCommands,
					...this.getMenuItems(),
				];
			})
			.with(APP_MODE.MENU, () => {
				return this.getMenuItems();
			})
			.with(APP_MODE.CLIPBOARD, async () => {
				return this.getClipboardCommands();
			})
			.with(APP_MODE.NOTES, async () => {
				await notesStore.fetchNotes();
				const noteCommands = await PluginNotes(this.buildPluginContext())?.addSearchResults?.(appStore.query) ?? [];
				return noteCommands;
			})
			.exhaustive();

		if (appStore.query.length === 0 && appStore.appMode === APP_MODE.INITIAL) {
			this.commands = sortBy((command: ExecutableCommand) => command.metadata?.ranAt ?? new Date())(commands).reverse();
			return
		}

		const filteredCommands = matchSorter(commands, appStore.query, {
			keys: ["localizedLabel", "label"],
		})

		// Prevent overriding commands
		if (newCommandsToken !== this.buildCommandsToken) {
			return;
		}

		// Formula commands would be filtered out by matchSorted, so it needs to happen here.
		const formulaCommands = appStore.appMode === APP_MODE.INITIAL ? await PluginNlp(this.buildPluginContext())?.addSearchResults?.(appStore.query) ?? [] : [];

		this.commands = uniq([...formulaCommands, ...filteredCommands]).sort((a, b) => this.sortCommands({ prev: a, next: b }));

		if (
			appStore.appMode === APP_MODE.INITIAL &&
			!isRefresh &&
			!this.isUpdatingExternalSource
		) {
			if (appStore.query.length > 0) {
				setTimeout(() => {
					this.fetchWebSearchCommands({
						query: appStore.query,
						token: newCommandsToken,
						excludeResult: queryIsUrl ? appStore.query : null,
					});
				}, 0);
			}

			if (appStore.query.length >= 3) {
				this.debouncedSpotlightSearch();
			}
		}
	}

	private startSpotlightSearch() {
		const spotlightToken = generateCancellationToken();
		this.spotlightSearchToken = spotlightToken;

		const additionalExtensions =
			settingsStore.data.fsSearchAdditionalExtensions;
		const searchOnlyInHome = settingsStore.data.fsSearchOnlyInHome;

		searchSpotlightApps(
			appStore.query,
			additionalExtensions,
			searchOnlyInHome,
		).then((result) => {
			if (spotlightToken !== this.spotlightSearchToken) {
				return;
			}

			this.spotlightCommands = result.map((entry) =>
				ExecutableCommandSchema.parse({
					label: entry.display_name,
					localizedLabel: entry.display_name,
					value: entry.path,
					path: entry.path,
					metadata: { contentType: entry.content_type },
					handler: COMMAND_HANDLER.FS_ITEM,
					appModes: [APP_MODE.INITIAL],
				}),
			);

			this.isUpdatingExternalSource = true;
			this.buildCommands({
				isRefresh: true,
			});
			this.isUpdatingExternalSource = false;
		});
	}

	sortCommands({
		prev,
		next,
	}: { prev: ExecutableCommand; next: ExecutableCommand }): number {
		return next.priority - prev.priority;
	}

	async removeHistoryOfType(handler: CommandHandler) {
		const filteredHistory = this.commandHistory
			.slice()
			.filter((entry) => entry.handler !== handler);
		await this.updateData({ commandHistory: filteredHistory });
	}

	async removeHistoryEntry({
		value,
		handler,
	}: Pick<HistoryEntry, "value" | "handler">) {
		const filteredHistory = this.commandHistory
			.slice()
			.filter((entry) => entry.handler !== handler || entry.value !== value);
		await this.updateData({ commandHistory: filteredHistory });
	}

	async clearHistory() {
		await this.updateData({ commandHistory: [] });
	}

	async handleCommand(command: ExecutableCommand) {
		if (!appStore.appWindow) return;
		const otherThanLast =
			this.commandHistory[this.commandHistory.length - 1]?.value !==
			command.value;
		const commandsToSkip = [
			COMMAND_HANDLER.CREATE_NOTE,
			COMMAND_HANDLER.SYSTEM,
		] as string[];

		const shouldRecord =
			!settingsStore.data.incognitoEnabled &&
			!commandsToSkip.includes(command.handler);

		if (otherThanLast && shouldRecord) {
			const filteredHistory = this.commandHistory
				.slice()
				.filter(
					(pastCommand) =>
						pastCommand.value !== command.value ||
						pastCommand.handler !== command.handler,
				);
			filteredHistory.push({ ...command, metadata: { ...command.metadata, ranAt: new Date() } });
			await this.updateData({ commandHistory: filteredHistory });
			setTimeout(() => {
				// Build with timeout, so it's not visible in the UI before user is moved to the app.
				this.buildCommands({
					isRefresh: true,
				});
			}, 100);
		}
		window.scrollTo({ top: 0 });
		return match(command)
			.with({ handler: COMMAND_HANDLER.APP }, async ({ value }) => {
				toggleVisibility();
				Command.create("open", ["-a", value]).execute();
			})
			.with({ handler: COMMAND_HANDLER.FS_ITEM }, async ({ value }) => {
				toggleVisibility();
				Command.create("open", [value]).execute();
			})
			.with({ handler: COMMAND_HANDLER.URL }, async ({ value }) => {
				toggleVisibility();
				openUrl(value);
			})
			.with({ handler: COMMAND_HANDLER.CHANGE_MODE }, async ({ value }) => {
				return goto(`/commands/${value}`);
			})
			.with(
				{
					handler: P.union(COMMAND_HANDLER.COPY_TO_CLIPBOARD),
				},
				async ({ value }) => {
					await navigator.clipboard.writeText(value);

					toggleVisibility();
				},
			)
			.with({ handler: COMMAND_HANDLER.SYSTEM }, async ({ value }) => {
				return match(value as SystemCommand)
					.with(SYSTEM_COMMAND.CLEAR_NOTES, async () => {
						await notesStore.clearNotes();
						this.removeHistoryOfType(COMMAND_HANDLER.OPEN_NOTE);
						appStore.switchMode(APP_MODE.INITIAL);
						return goto("/");
					})
					.with(SYSTEM_COMMAND.HELP, async () => {
						toggleVisibility();
						return openUrl("https://getgrinta.com/guides");
					})
					.with(SYSTEM_COMMAND.SETTINGS, async () => {
						return goto("/settings");
					})
					.with(SYSTEM_COMMAND.EXIT, async () => {
						return exit();
					})
					.with(SYSTEM_COMMAND.CLEAR_HISTORY, async () => {
						await this.clearHistory();
						appStore.switchMode(APP_MODE.INITIAL);
						return goto("/");
					})
					.with(SYSTEM_COMMAND.SIGN_IN, async () => {
						return goto("/sign-in");
					})
					.with(SYSTEM_COMMAND.PROFILE, async () => {
						return goto("/profile");
					})
					.with(SYSTEM_COMMAND.CLIPBOARD, async () => {
						return appStore.switchMode(APP_MODE.CLIPBOARD);
					})
					.exhaustive();
			})
			.with({ handler: COMMAND_HANDLER.OPEN_NOTE }, async ({ value }) => {
				const filename = encodeURIComponent(value);
				return goto(`/notes/${filename}`);
			})
			.with({ handler: COMMAND_HANDLER.CREATE_NOTE }, async ({ value }) => {
				const filename = await notesStore.createNote(value);
				const encodedFilename = encodeURIComponent(filename);
				return goto(`/notes/${encodedFilename}`);
			})
			.with({ handler: COMMAND_HANDLER.RUN_SHORTCUT }, async ({ value }) => {
				const result = await Command.create("shortcuts", [
					"run",
					value,
				]).execute();
				return result.code === 0;
			})
			.with({ handler: COMMAND_HANDLER.EMBEDDED_URL }, async ({ value }) => {
				const encodedValue = encodeURIComponent(value);
				return goto(`/web/${encodedValue}`);
			})
			.otherwise(() => {
				console.log("Run custom plugin handlers");
			});
	}

	buildPluginContext(): PluginContext {
		return {
			fetch,
			exec: this.handleCommand,
			t,
			fail: toast.error,
			app: {
				query: appStore.query,
				appMode: appStore.appMode,
			},
			settings: settingsStore.data,
			notes: notesStore.notes,
		}
	}

	async fetchWebSearchCommands({
		query,
		token,
		excludeResult,
	}: {
		query: string;
		token: string;
		excludeResult: string | null;
	}) {
		try {
			const webSearchCommands = await PluginWebSearch(this.buildPluginContext())?.addSearchResults?.(query) ?? [];

			// Check if the token is still valid (user hasn't typed something else)
			if (token !== this.buildCommandsToken) {
				return;
			}

			// Set flag to prevent infinite loop
			this.isUpdatingExternalSource = true;

			this.webSearchCommands = webSearchCommands.filter((cmd) => cmd.value !== excludeResult);
			this.buildCommands({
				isRefresh: true,
			});

			// Reset the flag after updating
			this.isUpdatingExternalSource = false;
		} catch (error) {
			this.isUpdatingExternalSource = false;
			console.error("Error fetching web search commands:", error);
		}
	}
}

export const commandsStore = new CommandsStore({
	schema: CommandsSchema,
	fileName: "commands.json",
	storageKey: "commands",
});
