import { goto } from "$app/navigation";
import { type DirEntry, readDir } from "@tauri-apps/plugin-fs";
import { fetch } from "@tauri-apps/plugin-http";
import { exit } from "@tauri-apps/plugin-process";
import { Command } from "@tauri-apps/plugin-shell";
import { load } from "@tauri-apps/plugin-store";
import nlp from "compromise";
import datePlugin from "compromise-dates";
import numbersPlugin from "compromise-numbers";
import { parse } from "equation-parser";
import { resolve } from "equation-resolver";
import { matchSorter } from "match-sorter";
import { uniq } from "rambda";
import { P, match } from "ts-pattern";
import { z } from "zod";
import { BAR_MODE, type BarMode, appStore } from "./app.svelte";
import { type Note, notesStore } from "./notes.svelte";
nlp.plugin(datePlugin);
nlp.plugin(numbersPlugin);

const APP_REGEX = /[^.]\.app$/;

const urlParser = z
	.string()
	.url()
	.regex(/^https?:\/\//);

// The order is important for command sorting.
export const COMMAND_HANDLER = {
	SYSTEM: "SYSTEM",
	APP: "APP",
	CHANGE_MODE: "CHANGE_MODE",
	FORMULA_RESULT: "FORMULA_RESULT",
	COPY_TO_CLIPBOARD: "COPY_TO_CLIPBOARD",
	RUN_SHORTCUT: "RUN_SHORTCUT",
	OPEN_NOTE: "OPEN_NOTE",
	CREATE_NOTE: "CREATE_NOTE",
	COMPLETE_NOTE: "COMPLETE_NOTE",
	URL: "URL",
} as const;

export type CommandHandler = keyof typeof COMMAND_HANDLER;

const commandsPriority = Object.keys(COMMAND_HANDLER);

type ExecutableCommand = {
	label: string;
	value: string;
	handler: CommandHandler;
};

export const SYSTEM_COMMAND = {
	CLEAR_NOTES: "CLEAR_NOTES",
	CLEAR_HISTORY: "CLEAR_HISTORY",
	HELP: "HELP",
	SETTINGS: "SETTINGS",
	EXIT: "EXIT",
} as const;

export type SystemCommand = keyof typeof SYSTEM_COMMAND;

type HistoryEntry = Omit<ExecutableCommand, "label">;

const MENU_ITEMS: ExecutableCommand[] = [
	{
		label: "Clear notes",
		value: SYSTEM_COMMAND.CLEAR_NOTES,
		handler: COMMAND_HANDLER.SYSTEM,
	},
	{
		label: "Clear commands history",
		value: SYSTEM_COMMAND.CLEAR_HISTORY,
		handler: COMMAND_HANDLER.SYSTEM,
	},
	{
		label: "Help",
		value: SYSTEM_COMMAND.HELP,
		handler: COMMAND_HANDLER.SYSTEM,
	},
	{
		label: "Settings",
		value: SYSTEM_COMMAND.SETTINGS,
		handler: COMMAND_HANDLER.SYSTEM,
	},
	{
		label: "Exit",
		value: SYSTEM_COMMAND.EXIT,
		handler: COMMAND_HANDLER.SYSTEM,
	},
];

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

function buildAppCommands(apps: DirEntry[]): ExecutableCommand[] {
	return apps
		.filter((app) => APP_REGEX.test(app.name))
		.map((app) => ({
			label: app.name.replace(".app", ""),
			value: app.name,
			handler: COMMAND_HANDLER.APP,
		}));
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

async function buildQueryCommands(query: string) {
	const encodedQuery = encodeURIComponent(query);
	const queryMatchSearch = [
		{
			label: `Search for "${query}"`,
			value: `https://www.startpage.com/do/search?q=${encodedQuery}`,
			handler: COMMAND_HANDLER.URL,
		},
	];

	if (query.length < 3) return queryMatchSearch;

	let completions: [string, string[]]
	const completionUrl = `https://www.startpage.com/osuggestions?q=${encodedQuery}`;

	try {
		// Might fail because of no connection or proxy
		const response = await fetch(completionUrl);
		completions = await response.json();
	} catch (error) {
		completions = [encodedQuery, []];
	}

	const completionList = completions[1].map((completion: string) => {
		const completionQuery = encodeURIComponent(completion);
		return {
			label: completion,
			value: `https://www.startpage.com/do/search?q=${completionQuery}`,
			handler: COMMAND_HANDLER.URL,
		};
	});
	const literalSearch = completionList.length > 0 ? [] : queryMatchSearch;

	return [
		...completionList,
		...literalSearch,
		{
			label: `Ask "${query}"`,
			value: query,
			handler: COMMAND_HANDLER.COMPLETE_NOTE,
		},
		{
			label: `Create "${query}" note`,
			value: query,
			handler: COMMAND_HANDLER.CREATE_NOTE,
		},
	];	
}

export class CommandsStore {
	commands = $state<ExecutableCommand[]>([]);
	commandHistory = $state<ExecutableCommand[]>([]);
	selectedIndex = $state<number>(0);

	async initialize() {
		const store = await load("commands.json");
		const commandHistory =
			(await store.get<ExecutableCommand[]>("commandHistory")) ?? [];
		if (!commandHistory) return;
		this.commandHistory = commandHistory;
	}

	async buildCommands(query: string) {
		this.selectedIndex = 0;
		const queryIsUrl = urlParser.safeParse(query);
		const commands: ExecutableCommand[] = await match(appStore.barMode)
			.with(BAR_MODE.INITIAL, async () => {
				const commandHistory = this.commandHistory.slice().reverse();
				if (query.length === 0) {
					return commandHistory;
				}
				let installedApps: DirEntry[] = [];
				installedApps = await readDir("/Applications");
				installedApps = [
					...installedApps,
					...(await readDir("/System/Applications")),
				];
				const availableShortcuts = await Command.create("shortcuts", [
					"list",
				]).execute();
				const shortcutCommands = buildShortcutCommands(
					availableShortcuts.stdout,
				);
				const appCommands = buildAppCommands(installedApps);
				const urlCommands = queryIsUrl.success
					? [
							{
								label: query,
								value: query,
								handler: COMMAND_HANDLER.URL,
							},
						]
					: [];
				const webSearchCommands = await buildQueryCommands(query);
				return [
					...appCommands,
					...urlCommands,
					...webSearchCommands,
					...commandHistory,
					...shortcutCommands,
					...MENU_ITEMS,
				];
			})
			.with(BAR_MODE.MENU, () => {
				return MENU_ITEMS;
			})
			.with(BAR_MODE.NOTES, async () => {
				const createNoteCommand =
					query.length > 0
						? [
								{
									label: `Create "${query}" note`,
									value: query,
									handler: COMMAND_HANDLER.CREATE_NOTE,
								},
							]
						: [];
				const notes = await notesStore.fetchNotes();
				return [...createNoteCommand, ...buildNoteCommands(notesStore.notes)];
			})
			.exhaustive();
		const sortedCommands =
			query.length === 0
				? commands
				: matchSorter(commands, query, {
						keys: ["label"],
					}).sort(
						(a, b) =>
							commandsPriority.indexOf(a.handler) -
							commandsPriority.indexOf(b.handler),
					);
		const formulaCommands = buildFormulaCommands(query);
		this.commands = uniq([...formulaCommands, ...sortedCommands]);
	}

	removeHistoryOfType(handler: CommandHandler) {
		const filteredHistory = this.commandHistory
			.slice()
			.filter((entry) => entry.handler !== handler);
		this.commandHistory = filteredHistory;
	}

	removeHistoryEntry({ value, handler }: HistoryEntry) {
		const filteredHistory = this.commandHistory
			.slice()
			.filter((entry) => entry.handler !== handler || entry.value !== value);
		this.commandHistory = filteredHistory;
	}

	async clearHistory() {
		const store = await load("commands.json");
		this.commandHistory = [];
		await store.set("commandHistory", this.commandHistory);
	}

	async openUrl(url: string) {
		return Command.create("open", ["-u", url]).execute();
	}

	async handleCommand(commandIndex: number | undefined) {
		if (!appStore.appWindow) return;
		const store = await load("commands.json");
		const command = this.commands[commandIndex ?? this.selectedIndex];
		const otherThanLast =
			this.commandHistory[this.commandHistory.length - 1]?.value !==
			command.value;
		const commandsToSkip = [
			COMMAND_HANDLER.COMPLETE_NOTE,
			COMMAND_HANDLER.CREATE_NOTE,
			COMMAND_HANDLER.SYSTEM,
		] as string[];
		const shouldRecord = !commandsToSkip.includes(command.handler);
		if (otherThanLast && shouldRecord) {
			const filteredHistory = this.commandHistory
				.slice()
				.filter(
					(pastCommand) =>
						pastCommand.value !== command.value ||
						pastCommand.handler !== command.handler,
				);
			filteredHistory.push(command);
			this.commandHistory = filteredHistory;
		}
		await store.set("commandHistory", this.commandHistory);
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
			.with({ handler: COMMAND_HANDLER.COMPLETE_NOTE }, async ({ value }) => {
				const filename = await notesStore.createNote(value);
				const encodedFilename = encodeURIComponent(filename);
				await notesStore.updateNote({ filename, content: "%G4TW%" });
				return goto(`/notes/${encodedFilename}`);
			})
			.with({ handler: COMMAND_HANDLER.RUN_SHORTCUT }, async ({ value }) => {
				const result = await Command.create("shortcuts", [
					"run",
					value,
				]).execute();
				return result.code === 0;
			})
			.exhaustive();
	}
}

export const commandsStore = new CommandsStore();
