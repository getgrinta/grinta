import { goto } from "$app/navigation";
import { until } from "@open-draft/until";
import { watch } from "@tauri-apps/plugin-fs";
import { fetch } from "@tauri-apps/plugin-http";
import { openUrl } from "@tauri-apps/plugin-opener";
import { exit } from "@tauri-apps/plugin-process";
import { Command } from "@tauri-apps/plugin-shell";
import nlp from "compromise";
import dates from "compromise-dates";
import numbers from "compromise-numbers";
import { matchSorter } from "match-sorter";
import { uniq } from "rambda";
import { _ } from "svelte-i18n";
import { toast } from "svelte-sonner";
import { get } from "svelte/store";
import { P, match } from "ts-pattern";
import { z } from "zod";
import {
	parseCurrencyConversion,
	parseFraction,
	parseMathExpression,
	parseRelativeTime,
	parseTextMathExpression,
	parseUnitConversion,
} from "../formula-commands";
import { searchSpotlightApps, toggleVisibility } from "../grinta-invoke";
import { appMetadataStore } from "../store/app-metadata.svelte";
import {
	type FileEntry,
	findApps,
	generateCancellationToken,
} from "../utils.svelte";
import { BAR_MODE, appStore } from "./app.svelte";
import { clipboardStore } from "./clipboard.svelte";
import { type Note, notesStore } from "./notes.svelte";
import { SecureStore } from "./secure.svelte";
import { settingsStore } from "./settings.svelte";
import debounce from "debounce";

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

const HOSTNAME_REGEX = /[a-zA-Z0-9\-.]{1,61}\.[a-zA-Z]{2,}/;

// The order is important for command sorting.
export const COMMAND_HANDLER = {
	SYSTEM: "SYSTEM",
	APP: "APP",
	CHANGE_MODE: "CHANGE_MODE",
	COPY_TO_CLIPBOARD: "COPY_TO_CLIPBOARD",
	RUN_SHORTCUT: "RUN_SHORTCUT",
	OPEN_NOTE: "OPEN_NOTE",
	CREATE_NOTE: "CREATE_NOTE",
	URL: "URL",
	EMBEDDED_URL: "EMBEDDED_URL",
	FS_ITEM: "FS_ITEM",
} as const;

export type CommandHandler = keyof typeof COMMAND_HANDLER;

const commandsPriority = Object.keys(COMMAND_HANDLER);
export const FileMetadataSchema = z.object({
	contentType: z.string(),
});

export const ExecutableCommandSchema = z.object({
	label: z.string(),
	localizedLabel: z.string().optional(),
	value: z.string(),
	path: z.string().nullable().optional(),
	metadata: FileMetadataSchema.optional().nullable(),
	handler: z.nativeEnum(COMMAND_HANDLER),
	smartMatch: z.boolean().optional().default(false),
});

export type ExecutableCommand = z.infer<typeof ExecutableCommandSchema> & {
	isHistory?: boolean;
};

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

async function fetchCompletions(query: string) {
	type CompletionResult = [string, string[]];
	const encodedQuery = encodeURIComponent(query);
	const completionUrl = `https://www.startpage.com/osuggestions?q=${encodedQuery}`;
	const { data: response, error: fetchError } = await until(() =>
		fetch(completionUrl),
	);
	if (fetchError) {
		toast.error("Failed to fetch completions");
	}
	if (!response) return [query, []] as CompletionResult;
	const { data: json, error: jsonError } = await until<Error, CompletionResult>(
		() => response.json(),
	);
	if (jsonError) {
		toast.error("Failed to parse completions");
	}
	if (!json) return [query, []] as CompletionResult;
	return json;
}

async function buildFormulaCommands(
	currentQuery: string,
): Promise<ExecutableCommand[]> {
	// Try parsing as a mathematical expression first
	const mathCommands = parseMathExpression(currentQuery);
	if (mathCommands.length > 0) {
		return mathCommands;
	}

	// Try parsing text-based math expressions like "five times seven"
	const textMathCommands = parseTextMathExpression(currentQuery);
	if (textMathCommands.length > 0) {
		return textMathCommands;
	}

	// Try parsing currency conversions like "10 usd to eur"
	const currencyCommands = await parseCurrencyConversion(currentQuery);
	if (currencyCommands.length > 0) {
		return currencyCommands;
	}

	// Try parsing unit conversions like "5 inches to cm"
	const unitConversionCommands = parseUnitConversion(currentQuery);
	if (unitConversionCommands.length > 0) {
		return unitConversionCommands;
	}

	// Try parsing relative time expressions
	const timeCommands = parseRelativeTime(currentQuery);
	if (timeCommands.length > 0) {
		return timeCommands;
	}

	// Try parsing text fractions like "two thirds"
	const fractionCommands = parseFraction(currentQuery);
	if (fractionCommands.length > 0) {
		return fractionCommands;
	}

	return [];
}

async function buildAppCommands(
	apps: FileEntry[],
): Promise<ExecutableCommand[]> {
	return apps.map((app) => {
		const defaultName = app.name.slice(0, -4);
		const localizedName = appMetadataStore.getLocalizedName(defaultName);

		return {
			label: defaultName,
			localizedLabel: localizedName,
			value: app.name,
			path: app.path,
			handler: COMMAND_HANDLER.APP,
			smartMatch: false,
		};
	});
}

function buildNoteCommands(notes: Note[]): ExecutableCommand[] {
	return notes.map((note) => ({
		label: note.title,
		value: note.filename,
		handler: COMMAND_HANDLER.OPEN_NOTE,
		smartMatch: false,
	}));
}

function buildShortcutCommands(stdout: string) {
	const shortcuts = stdout.split(/\r?\n/);
	return shortcuts.map((shortcut) => ({
		label: shortcut,
		value: shortcut,
		handler: COMMAND_HANDLER.RUN_SHORTCUT,
		smartMatch: false,
	}));
}

async function buildQueryCommands(
	query: string,
	excludeResult: string | null = null,
) {
	const queryMatchSearch = [
		{
			label: t("commands.actions.search", { query }),
			value: settingsStore.getSearchUrl(query),
			handler: COMMAND_HANDLER.URL,
			smartMatch: false,
		},
	];
	if (query.length < 3) return queryMatchSearch;
	const completions = await fetchCompletions(query);
	const completionList = completions[1].map((completion: string) => {
		const completionQuery = encodeURIComponent(completion);
		return {
			label: completion,
			value: settingsStore.getSearchUrl(completionQuery),
			handler: COMMAND_HANDLER.URL,
			smartMatch: false,
		};
	});
	const literalSearch = completionList.length > 0 ? [] : queryMatchSearch;
	return [
		...completionList,
		...literalSearch,
		{
			label: t("commands.actions.createNote", { query }),
			value: query,
			handler: COMMAND_HANDLER.CREATE_NOTE,
			smartMatch: false,
		},
	].filter((a) => a.label !== excludeResult);
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
		const userCommands = appStore?.user
			? [
					{
						label: t("commands.menuItems.profile"),
						value: SYSTEM_COMMAND.PROFILE,
						handler: COMMAND_HANDLER.SYSTEM,
						smartMatch: false,
					},
				]
			: [
					{
						label: t("commands.menuItems.signIn"),
						value: SYSTEM_COMMAND.SIGN_IN,
						handler: COMMAND_HANDLER.SYSTEM,
						smartMatch: false,
					},
				];
		return [
			...userCommands,
			...(settingsStore.data?.clipboardRecordingEnabled
				? [
						{
							label: t("commands.menuItems.clipboardHistory"),
							value: SYSTEM_COMMAND.CLIPBOARD,
							handler: COMMAND_HANDLER.SYSTEM,
							smartMatch: false,
						},
					]
				: []),
			{
				label: t("commands.menuItems.clearNotes"),
				value: SYSTEM_COMMAND.CLEAR_NOTES,
				handler: COMMAND_HANDLER.SYSTEM,
				smartMatch: false,
			},
			{
				label: t("commands.menuItems.clearHistory"),
				value: SYSTEM_COMMAND.CLEAR_HISTORY,
				handler: COMMAND_HANDLER.SYSTEM,
				smartMatch: false,
			},
			{
				label: t("commands.menuItems.help"),
				value: SYSTEM_COMMAND.HELP,
				handler: COMMAND_HANDLER.SYSTEM,
				smartMatch: false,
			},
			{
				label: t("commands.menuItems.settings"),
				value: SYSTEM_COMMAND.SETTINGS,
				handler: COMMAND_HANDLER.SYSTEM,
				smartMatch: false,
			},
			{
				label: t("commands.menuItems.exit"),
				value: SYSTEM_COMMAND.EXIT,
				handler: COMMAND_HANDLER.SYSTEM,
				smartMatch: false,
			},
		];
	}

	getClipboardCommands(): ExecutableCommand[] {
		return clipboardStore.data.clipboardHistory
			.filter((clipboardEntry) => clipboardEntry.trim().length > 0)
			.reverse()
			.map((clipboardEntry) => ({
				label: clipboardEntry,
				value: clipboardEntry,
				handler: COMMAND_HANDLER.COPY_TO_CLIPBOARD,
				smartMatch: false,
			}));
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
			(async () => {
				await this.buildShortcutCommands();
			})();
		}, 10_000);
	}

	private async buildShortcutCommands() {
		const availableShortcuts = await Command.create("shortcuts", [
			"list",
		]).execute();
		this.shortcutCommands = buildShortcutCommands(availableShortcuts.stdout);
	}

	async buildAppCommands() {
		// Use spotlight query through rust in the future
		/*
		let query = NSMetadataQuery()
		query.searchScopes = [NSMetadataQueryLocalComputerScope]
		query.predicate = NSPredicate(format: "kMDItemContentType == 'com.apple.application-bundle'")
		*/

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

		let commands: ExecutableCommand[] = [];

		commands = await match(appStore.barMode)
			.with(BAR_MODE.INITIAL, async () => {
				let commandHistory = this.commandHistory
					.slice()
					.reverse()
					.map((command) => ({ ...command, isHistory: true }));

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

				return [
					...this.appCommands,
					...this.buildUrlCommands(queryIsUrl, appStore.query),
					...this.webSearchCommands,
					...this.spotlightCommands,
					...commandHistory,
					...this.shortcutCommands,
					...this.getMenuItems(),
				];
			})
			.with(BAR_MODE.MENU, () => {
				return this.getMenuItems();
			})
			.with(BAR_MODE.CLIPBOARD, async () => {
				return this.getClipboardCommands();
			})
			.with(BAR_MODE.NOTES, async () => {
				const createNoteCommand =
					appStore.query.length > 0
						? [
								{
									label: t("commands.actions.createNote", {
										query: appStore.query,
									}),
									value: appStore.query,
									handler: COMMAND_HANDLER.CREATE_NOTE,
									smartMatch: false,
								},
							]
						: [];

				await notesStore.fetchNotes();
				return [...createNoteCommand, ...buildNoteCommands(notesStore.notes)];
			})
			.exhaustive();

		const sortedAndFilteredCommands =
			appStore.query.length === 0
				? commands
				: matchSorter(commands, appStore.query, {
						keys: ["localizedLabel", "label"],
					}).sort((a, b) => this.sortCommands({ prev: a, next: b }));

		const formulaCommands = await buildFormulaCommands(appStore.query);

		// Prevent overriding commands
		if (newCommandsToken !== this.buildCommandsToken) {
			return;
		}

		this.commands = uniq([...formulaCommands, ...sortedAndFilteredCommands]);

		if (
			appStore.barMode === BAR_MODE.INITIAL &&
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

			this.spotlightCommands = result.map((entry) => ({
				label: entry.display_name,
				smartMatch: false,
				value: entry.path,
				path: entry.path,
				metadata: { contentType: entry.content_type },
				handler: COMMAND_HANDLER.FS_ITEM,
			}));

			this.isUpdatingExternalSource = true;
			this.buildCommands({
				isRefresh: true,
			});
			this.isUpdatingExternalSource = false;
		});
	}

	private buildUrlCommands(
		queryIsUrl: boolean,
		query: string,
	): ExecutableCommand[] {
		if (!queryIsUrl) {
			return [];
		}
		const value = query.match(/^https?:\/\//) ? query : `https://${query}`;
		const command = {
			label: query,
			value,
			handler: COMMAND_HANDLER.URL,
			smartMatch: false,
		};
		return [command];
	}

	sortCommands({
		prev,
		next,
	}: { prev: ExecutableCommand; next: ExecutableCommand }): number {
		return (
			commandsPriority.indexOf(prev.handler) -
			commandsPriority.indexOf(next.handler)
		);
	}

	async removeHistoryOfType(handler: CommandHandler) {
		const filteredHistory = this.commandHistory
			.slice()
			.filter((entry) => entry.handler !== handler);
		await this.updateData({ commandHistory: filteredHistory });
	}

	async removeHistoryEntry({ value, handler }: HistoryEntry) {
		const filteredHistory = this.commandHistory
			.slice()
			.filter((entry) => entry.handler !== handler || entry.value !== value);
		await this.updateData({ commandHistory: filteredHistory });
	}

	async clearHistory() {
		await this.updateData({ commandHistory: [] });
	}

	async openUrl(url: string) {
		return openUrl(url);
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
			filteredHistory.push(command);
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
				await Command.create("open", ["-a", value]).execute();
			})
			.with({ handler: COMMAND_HANDLER.FS_ITEM }, async ({ value }) => {
				await Command.create("open", [value]).execute();
			})
			.with({ handler: COMMAND_HANDLER.URL }, async ({ value }) => {
				await this.openUrl(value);
				toggleVisibility();
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
						appStore.barMode = BAR_MODE.INITIAL;
						return goto("/");
					})
					.with(SYSTEM_COMMAND.HELP, async () => {
						return this.openUrl("https://getgrinta.com/guides");
					})
					.with(SYSTEM_COMMAND.SETTINGS, async () => {
						return goto("/settings");
					})
					.with(SYSTEM_COMMAND.EXIT, async () => {
						return exit();
					})
					.with(SYSTEM_COMMAND.CLEAR_HISTORY, async () => {
						await this.clearHistory();
						appStore.barMode = BAR_MODE.INITIAL;
						return goto("/");
					})
					.with(SYSTEM_COMMAND.SIGN_IN, async () => {
						return goto("/sign-in");
					})
					.with(SYSTEM_COMMAND.PROFILE, async () => {
						return goto("/profile");
					})
					.with(SYSTEM_COMMAND.CLIPBOARD, async () => {
						return appStore.switchMode(BAR_MODE.CLIPBOARD);
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
			.exhaustive();
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
			const webSearchCommands = await buildQueryCommands(query, excludeResult);

			// Check if the token is still valid (user hasn't typed something else)
			if (token !== this.buildCommandsToken) {
				return;
			}

			// Set flag to prevent infinite loop
			this.isUpdatingExternalSource = true;

			this.webSearchCommands = webSearchCommands;
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
