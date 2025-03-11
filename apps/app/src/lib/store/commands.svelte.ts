import { goto } from "$app/navigation";
import { appMetadataStore } from "$lib/store/app-metadata.svelte";
import { generateCancellationToken } from "$lib/utils.svelte";
import { until } from "@open-draft/until";
import { type DirEntry, readDir, watch } from "@tauri-apps/plugin-fs";
import { fetch } from "@tauri-apps/plugin-http";
import { openPath, openUrl } from "@tauri-apps/plugin-opener";
import { exit } from "@tauri-apps/plugin-process";
import { Command } from "@tauri-apps/plugin-shell";
import nlp from "compromise";
import datePlugin from "compromise-dates";
import numbersPlugin from "compromise-numbers";
import { parse } from "equation-parser";
import { resolve } from "equation-resolver";
import { matchSorter } from "match-sorter";
import { uniq } from "rambda";
import { _ } from "svelte-i18n";
import { toast } from "svelte-sonner";
import { get } from "svelte/store";
import { P, match } from "ts-pattern";
import { z } from "zod";
import {
	BAR_MODE,
	type BarMode,
	type SearchMode,
	appStore,
} from "./app.svelte";
import { type Note, notesStore } from "./notes.svelte";
import { SecureStore } from "./secure.svelte";
import { settingsStore } from "./settings.svelte";

nlp.plugin(datePlugin);
nlp.plugin(numbersPlugin);

function t(key: string, params: Record<string, string> = {}) {
	try {
		const translationFn = get(_);
		return translationFn(key, { values: params });
	} catch {
		return key;
	}
}

const HOSTNAME_REGEX = /[a-zA-Z0-9\-\.]{1,61}\.[a-zA-Z]{2,}/;

// The order is important for command sorting.
export const COMMAND_HANDLER = {
	SMART_MATCH: "SMART_MATCH",
	SYSTEM: "SYSTEM",
	APP: "APP",
	CHANGE_MODE: "CHANGE_MODE",
	FORMULA_RESULT: "FORMULA_RESULT",
	COPY_TO_CLIPBOARD: "COPY_TO_CLIPBOARD",
	RUN_SHORTCUT: "RUN_SHORTCUT",
	OPEN_NOTE: "OPEN_NOTE",
	CREATE_NOTE: "CREATE_NOTE",
	URL: "URL",
	EMBEDDED_URL: "EMBEDDED_URL",
} as const;

export type CommandHandler = keyof typeof COMMAND_HANDLER;

const commandsPriority = Object.keys(COMMAND_HANDLER);

const ExecutableCommandSchema = z.object({
	label: z.string(),
	localizedLabel: z.string().optional(),
	value: z.string(),
	handler: z.nativeEnum(COMMAND_HANDLER),
});

export type ExecutableCommand = z.infer<typeof ExecutableCommandSchema>;

export const SYSTEM_COMMAND = {
	SIGN_IN: "SIGN_IN",
	PROFILE: "PROFILE",
	CLEAR_NOTES: "CLEAR_NOTES",
	CLEAR_HISTORY: "CLEAR_HISTORY",
	HELP: "HELP",
	SETTINGS: "SETTINGS",
	EXIT: "EXIT",
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

function buildFormulaCommands(currentQuery: string): ExecutableCommand[] {
	const parsed = parse(currentQuery);
	const resolved = resolve(parsed);
	if (resolved.type !== "number") return [];
	const value = resolved.value.toString();
	return [
		{
			label: value,
			value,
			handler: COMMAND_HANDLER.FORMULA_RESULT,
		},
	];
}

async function buildAppCommands(
	apps: DirEntry[],
): Promise<ExecutableCommand[]> {
	return apps.map((app) => {
		const defaultName = app.name.slice(0, -4);
		const localizedName = appMetadataStore.getLocalizedName(defaultName);

		return {
			label: defaultName,
			localizedLabel: localizedName,
			value: app.name,
			handler: COMMAND_HANDLER.APP,
		};
	});
}

function buildNoteCommands(notes: Note[]): ExecutableCommand[] {
	return notes.map((note) => ({
		label: note.title,
		value: note.filename,
		handler: COMMAND_HANDLER.OPEN_NOTE,
	}));
}

function buildShortcutCommands(stdout: string) {
	const shortcuts = stdout.split(/\r?\n/);
	return shortcuts.map((shortcut) => ({
		label: shortcut,
		value: shortcut,
		handler: COMMAND_HANDLER.RUN_SHORTCUT,
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
	selectedIndex = $state<number>(0);
	installedApps = $state<DirEntry[]>([]);
	appCommands = $state<ExecutableCommand[]>([]);
	shortcutCommands = $state<ExecutableCommand[]>([]);
	webSearchCommands = $state<ExecutableCommand[]>([]);
	isUpdatingFromWebSearch = $state<boolean>(false);

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
					},
				]
			: [
					{
						label: t("commands.menuItems.signIn"),
						value: SYSTEM_COMMAND.SIGN_IN,
						handler: COMMAND_HANDLER.SYSTEM,
					},
				];
		return [
			...userCommands,
			{
				label: t("commands.menuItems.clearNotes"),
				value: SYSTEM_COMMAND.CLEAR_NOTES,
				handler: COMMAND_HANDLER.SYSTEM,
			},
			{
				label: t("commands.menuItems.clearHistory"),
				value: SYSTEM_COMMAND.CLEAR_HISTORY,
				handler: COMMAND_HANDLER.SYSTEM,
			},
			{
				label: t("commands.menuItems.help"),
				value: SYSTEM_COMMAND.HELP,
				handler: COMMAND_HANDLER.SYSTEM,
			},
			{
				label: t("commands.menuItems.settings"),
				value: SYSTEM_COMMAND.SETTINGS,
				handler: COMMAND_HANDLER.SYSTEM,
			},
			{
				label: t("commands.menuItems.exit"),
				value: SYSTEM_COMMAND.EXIT,
				handler: COMMAND_HANDLER.SYSTEM,
			},
		];
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

		await this.watchForApplicationChanges();

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

		async function findAppsInDirectory(path: string): Promise<DirEntry[]> {
			const entries = await readDir(path);
			const apps: DirEntry[] = [];

			for (const entry of entries) {
				if (entry.isDirectory) {
					if (entry.name.endsWith(".app")) {
						apps.push(entry);
					} else {
						// Don't recurse into .app directories
						if (!entry.name.includes(".app/")) {
							try {
								const subApps = await findAppsInDirectory(
									`${path}/${entry.name}`,
								);
								apps.push(...subApps);
							} catch {
								// Permission errors
							}
						}
					}
				}
			}

			return apps;
		}

		const [appsFromApplications, appsFromSystemApplications] =
			await Promise.all([
				findAppsInDirectory("/Applications"),
				findAppsInDirectory("/System/Applications"),
			]);

		this.installedApps = [
			...appsFromApplications,
			...appsFromSystemApplications,
		];
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
		query,
		barMode,
	}: { query: string; searchMode: SearchMode; barMode: BarMode }) {
		// Skip if we're currently updating from web search to prevent infinite loop
		if (this.isUpdatingFromWebSearch) {
			return;
		}

		this.selectedIndex = 0;
		const queryIsUrl = HOSTNAME_REGEX.test(query);
		const newCommandsToken = generateCancellationToken();
		this.buildCommandsToken = newCommandsToken;

		let commands: ExecutableCommand[] = [];

		commands = await match(barMode)
			.with(BAR_MODE.INITIAL, async () => {
				let commandHistory = this.commandHistory.slice().reverse();
				if (query.length === 0) {
					return commandHistory;
				}

				// Filter out commands of the same url as the current query
				if (queryIsUrl) {
					commandHistory = commandHistory.filter(
						(a) => a.label !== query && a.handler !== COMMAND_HANDLER.URL,
					);
				}

				return [
					...this.appCommands,
					...this.buildUrlCommands(queryIsUrl, query),
					...this.webSearchCommands,
					...commandHistory,
					...this.shortcutCommands,
					...this.getMenuItems(),
				];
			})
			.with(BAR_MODE.MENU, () => {
				return this.getMenuItems();
			})
			.with(BAR_MODE.NOTES, async () => {
				const createNoteCommand =
					query.length > 0
						? [
								{
									label: t("commands.actions.createNote", { query }),
									value: query,
									handler: COMMAND_HANDLER.CREATE_NOTE,
								},
							]
						: [];

				await notesStore.fetchNotes();
				return [...createNoteCommand, ...buildNoteCommands(notesStore.notes)];
			})
			.exhaustive();

		const sortedAndFilteredCommands =
			query.length === 0
				? commands
				: matchSorter(commands, query, {
						keys: ["localizedLabel", "label"],
					}).sort((a, b) => this.sortCommands({ prev: a, next: b }));

		const formulaCommands = buildFormulaCommands(query);

		// Prevent overriding commands
		if (newCommandsToken !== this.buildCommandsToken) {
			return;
		}

		this.commands = uniq([...formulaCommands, ...sortedAndFilteredCommands]);

		if (query.length > 0 && barMode === "INITIAL") {
			setTimeout(() => {
				this.fetchWebSearchCommands(
					query,
					newCommandsToken,
					queryIsUrl ? query : null,
				);
			}, 0);
		}
	}

	private buildUrlCommands(queryIsUrl: boolean, query: string) {
		return queryIsUrl
			? [
					{
						label: query,
						value:
							query.startsWith("http://") || query.startsWith("https://")
								? query
								: `https://${query}`,
						handler: COMMAND_HANDLER.URL,
					},
				]
			: [];
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

	removeHistoryOfType(handler: CommandHandler) {
		const filteredHistory = this.commandHistory
			.slice()
			.filter((entry) => entry.handler !== handler);
		this.updateData({ commandHistory: filteredHistory });
	}

	removeHistoryEntry({ value, handler }: HistoryEntry) {
		const filteredHistory = this.commandHistory
			.slice()
			.filter((entry) => entry.handler !== handler || entry.value !== value);
		this.updateData({ commandHistory: filteredHistory });
	}

	async clearHistory() {
		this.updateData({ commandHistory: [] });
	}

	async openUrl(url: string) {
		return openUrl(url);
	}

	async handleCommand(commandIndex: number | undefined) {
		if (!appStore.appWindow) return;
		const command = this.commands[commandIndex ?? this.selectedIndex];
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
			this.updateData({ commandHistory: filteredHistory });
		}
		window.scrollTo({ top: 0 });
		return match(command)
			.with({ handler: COMMAND_HANDLER.APP }, async ({ value }) => {
				await Command.create("open", ["-a", value]).execute();
				return appStore.appWindow?.hide();
			})
			.with({ handler: COMMAND_HANDLER.URL }, async ({ value }) => {
				await this.openUrl(value);
				return appStore.appWindow?.hide();
			})
			.with({ handler: COMMAND_HANDLER.CHANGE_MODE }, async ({ value }) => {
				return goto(`/commands/${value}`);
			})
			.with(
				{
					handler: P.union(
						COMMAND_HANDLER.COPY_TO_CLIPBOARD,
						COMMAND_HANDLER.FORMULA_RESULT,
					),
				},
				async ({ value }) => {
					await navigator.clipboard.writeText(value);
					return appStore.appWindow?.hide();
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
						return this.openUrl("https://getgrinta.com/docs");
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
			.with({ handler: COMMAND_HANDLER.SMART_MATCH }, async ({ value }) => {
				console.log(">>>SMART_MATCH", value);
			})
			.with({ handler: COMMAND_HANDLER.EMBEDDED_URL }, async ({ value }) => {
				const encodedValue = encodeURIComponent(value);
				return goto(`/web/${encodedValue}`);
			})
			.exhaustive();
	}

	async fetchWebSearchCommands(
		query: string,
		token: string,
		excludeResult: string | null = null,
	) {
		if (query.length < 1) {
			return;
		}

		const queryIsUrl = HOSTNAME_REGEX.test(query);

		try {
			const webSearchCommands = await buildQueryCommands(query, excludeResult);

			// Check if the token is still valid (user hasn't typed something else)
			if (token !== this.buildCommandsToken) {
				return;
			}

			// Set flag to prevent infinite loop
			this.isUpdatingFromWebSearch = true;

			// Update web search commands
			this.webSearchCommands = webSearchCommands;

			// Rebuild the commands with the new web search results
			let commandHistory = this.commandHistory.slice().reverse();

			// Filter out commands of the same url as the current query
			if (queryIsUrl) {
				commandHistory = commandHistory.filter(
					(a) => a.label !== query && a.handler !== COMMAND_HANDLER.URL,
				);
			}

			const commands = [
				...this.appCommands,
				...this.buildUrlCommands(queryIsUrl, query),
				...this.webSearchCommands,
				...commandHistory,
				...this.shortcutCommands,
				...this.getMenuItems(),
			];

			const sortedAndFilteredCommands = matchSorter(commands, query, {
				keys: ["localizedLabel", "label"],
			}).sort((a, b) => this.sortCommands({ prev: a, next: b }));

			const formulaCommands = buildFormulaCommands(query);

			// Update the commands list
			this.commands = uniq([...formulaCommands, ...sortedAndFilteredCommands]);

			// Reset the flag after updating
			this.isUpdatingFromWebSearch = false;
		} catch (error) {
			this.isUpdatingFromWebSearch = false;
			console.error("Error fetching web search commands:", error);
		}
	}
}

export const commandsStore = new CommandsStore({
	schema: CommandsSchema,
	fileName: "commands.json",
	storageKey: "commands",
});
