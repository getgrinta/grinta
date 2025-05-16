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
import { type PluginContext } from "@getgrinta/plugin";
import {
  PluginWebSearch,
  PluginNotes,
  PluginNlp,
  PluginExactUrl,
} from "@getgrinta/plugin-search";
import { searchSpotlightApps, toggleVisibility } from "../grinta-invoke";
import { appMetadataStore } from "../store/app-metadata.svelte";
import {
  extractMeetingInfo,
  type FileEntry,
  findApps,
  generateCancellationToken,
  t,
} from "../utils.svelte";
import { appStore } from "./app.svelte";
import { clipboardStore } from "./clipboard.svelte";
import { notesStore } from "./notes.svelte";
import { SecureStore } from "./secure.svelte";
import { settingsStore } from "./settings.svelte";
import debounce from "debounce";
import { calendarStore } from "$lib/store/calendar.svelte";
import type { EventInfo } from "$lib/types/calendar";

export type { ExecutableCommand };

nlp.extend(dates);
nlp.extend(numbers);

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

  async buildCommands({ isRefresh = false }: { isRefresh: boolean }) {
    if (!isRefresh) {
      this.selectedIndex = 0;
    }

    const queryIsUrl = HOSTNAME_REGEX.test(appStore.query);
    const newCommandsToken = generateCancellationToken();
    this.buildCommandsToken = newCommandsToken;

    let commands: ExecutableCommand[] = await match(appStore.appMode)
      .with(APP_MODE.INITIAL, async () => {
        let commandHistory = this.commandHistory.slice().reverse();
        if (appStore.query.length === 0) {
          return commandHistory;
        }

        if (queryIsUrl) {
          commandHistory = commandHistory.filter(
            (a) =>
              a.label !== appStore.query && a.handler !== COMMAND_HANDLER.URL,
          );
        }

        const exactUrlCommands =
          (await PluginExactUrl(this.buildPluginContext())?.addSearchResults?.(
            appStore.query,
          )) ?? [];

        return [
          ...this.appCommands,
          ...exactUrlCommands,
          ...this.webSearchCommands,
          ...this.spotlightCommands,
          ...commandHistory,
          ...this.shortcutCommands,
        ];
      })
      .with(APP_MODE.CLIPBOARD, async () => {
        return this.getClipboardCommands();
      })
      .with(APP_MODE.NOTES, async () => {
        await notesStore.fetchNotes();
        const noteCommands =
          (await PluginNotes(this.buildPluginContext())?.addSearchResults?.(
            appStore.query,
          )) ?? [];
        return noteCommands;
      })
      .with(APP_MODE.CALENDAR, async () => {
        const events = calendarStore.events.filter((event) => {
          return (
            !settingsStore.data.ignoredEventIds.includes(event.identifier) &&
            settingsStore.data.selectedCalendarIdentifiers.includes(
              event.calendar_id,
            )
          );
        });

        const colorByCalendarId = calendarStore.availableCalendars.reduce(
          (acc, calendar) => {
            acc[calendar.identifier] = calendar.color;
            return acc;
          },
          {} as Record<string, string>,
        );

        const mappedCommands = events.map((event: EventInfo) => {
          const meetingInfo = extractMeetingInfo(event.notes);

          return ExecutableCommandSchema.parse({
            label: event.title,
            localizedLabel: event.title,
            value: event.identifier,
            handler: COMMAND_HANDLER.OPEN_CALENDAR,
            metadata: {
              calendarSchema: {
                eventId: event.identifier,
                calendarIdentifier: event.calendar_id,
                backgroundColor: colorByCalendarId[event.calendar_id],
                startTime: event.start_date,
                endTime: event.end_date,
                location: event.location ?? undefined,
                notes: event.notes ?? undefined,
                participants: event.participants,
                isAllDay: event.is_all_day,
                meeting: meetingInfo,
              },
            },
            priority: COMMAND_PRIORITY.HIGH,
            appModes: [APP_MODE.CALENDAR],
          });
        });

        return mappedCommands;
      })
      .exhaustive();

    if (appStore.query.length === 0 && appStore.appMode === APP_MODE.INITIAL) {
      this.commands = sortBy(
        (command: ExecutableCommand) => command.metadata?.ranAt ?? new Date(),
      )(commands).reverse();
      return;
    }

    const filteredCommands = matchSorter(commands, appStore.query, {
      keys: ["localizedLabel", "label"],
    });

    // Prevent overriding commands
    if (newCommandsToken !== this.buildCommandsToken) {
      return;
    }

    if (appStore.appMode === APP_MODE.NOTES) {
      this.commands = uniq(
        sortBy(
          (command: ExecutableCommand) =>
            command.metadata?.updatedAt ?? new Date(),
        )(filteredCommands).reverse(),
      );
      return;
    } else if (appStore.appMode === APP_MODE.CALENDAR) {
      this.commands = sortBy(
        (command: ExecutableCommand) =>
          command.metadata?.calendarSchema?.startTime ?? new Date(),
      )(filteredCommands);
      return;
    }

    // Formula commands would be filtered out by matchSorted, so it needs to happen here.
    const formulaCommands =
      appStore.appMode === APP_MODE.INITIAL
        ? ((await PluginNlp(this.buildPluginContext())?.addSearchResults?.(
            appStore.query,
          )) ?? [])
        : [];

    let quickSearchCommand: ExecutableCommand | null = null;
    if (appStore.appMode === APP_MODE.INITIAL && appStore.quickSearchMode) {
      const hostname = new URL(appStore.quickSearchMode.searchUrl("")).hostname;
      const placeholder = t("settings.quick_search.openIn").replace(
        "{hostname}",
        hostname,
      );
      quickSearchCommand = ExecutableCommandSchema.parse({
        value: placeholder,
        label: placeholder,
        localizedLabel: placeholder,
        metadata: {},
        handler: COMMAND_HANDLER.URL,
        appModes: [APP_MODE.INITIAL],
        smartMatch: true,
        priority: COMMAND_PRIORITY.TOP,
      });
    }

    if (quickSearchCommand) {
      this.commands = uniq([
        ...formulaCommands,
        ...filteredCommands,
        quickSearchCommand,
      ]).sort((a, b) => this.sortCommands({ prev: a, next: b }));
    } else {
      this.commands = uniq([...formulaCommands, ...filteredCommands]).sort(
        (a, b) => this.sortCommands({ prev: a, next: b }),
      );
    }

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
  }: {
    prev: ExecutableCommand;
    next: ExecutableCommand;
  }): number {
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

  async handleCommand({
    command,
    recordingEnabled = true,
  }: {
    command: ExecutableCommand;
    recordingEnabled?: boolean;
  }) {
    if (!appStore.appWindow) return;
    const otherThanLast =
      this.commandHistory[this.commandHistory.length - 1]?.value !==
      command.value;
    const commandsToSkipRecording = [
      COMMAND_HANDLER.CREATE_NOTE,
      COMMAND_HANDLER.SYSTEM,
      COMMAND_HANDLER.OPEN_CALENDAR,
    ] as string[];

    const shouldRecord =
      recordingEnabled &&
      !settingsStore.data.incognitoEnabled &&
      !commandsToSkipRecording.includes(command.handler);

    if (otherThanLast && shouldRecord) {
      const filteredHistory = this.commandHistory
        .slice()
        .filter(
          (pastCommand) =>
            pastCommand.value !== command.value ||
            pastCommand.handler !== command.handler,
        );
      filteredHistory.push({
        ...command,
        metadata: { ...command.metadata, ranAt: new Date() },
      });
      await this.updateData({ commandHistory: filteredHistory });
      setTimeout(() => {
        // Build with timeout, so it's not visible in the UI before user is moved to the app.
        this.buildCommands({
          isRefresh: true,
        });
      }, 100);
    }
    window.scrollTo({ top: 0 });

    const handleExternalOpen = () => {
      appStore.clearQuery();
      toggleVisibility();
    };

    return match(command)
      .with({ handler: COMMAND_HANDLER.APP }, async ({ value }) => {
        handleExternalOpen();
        Command.create("open", ["-a", value]).execute();
      })
      .with({ handler: COMMAND_HANDLER.FS_ITEM }, async ({ value }) => {
        handleExternalOpen();
        Command.create("open", [value]).execute();
      })
      .with({ handler: COMMAND_HANDLER.URL }, async ({ value }) => {
        handleExternalOpen();
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

          handleExternalOpen();
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
      .with({ handler: COMMAND_HANDLER.CREATE_NOTE }, async () => {
        const filename = await notesStore.createNote(
          appStore.query.length > 0 ? appStore.query : undefined,
        );
        const encodedFilename = encodeURIComponent(filename);
        return goto(`/notes/${encodedFilename}`);
      })
      .with({ handler: COMMAND_HANDLER.RUN_SHORTCUT }, async ({ value }) => {
        toggleVisibility();
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
      .with({ handler: COMMAND_HANDLER.OPEN_CALENDAR }, async ({ value }) => {
        return goto(`/calendar/${value}`);
      })
      .otherwise(() => {
        console.log("Run custom plugin handlers");
      });
  }

  buildPluginContext(): PluginContext {
    return {
      fetch,
      exec: (command) => this.handleCommand({ command }),
      t,
      fail: toast.error,
      app: {
        query: appStore.query,
        appMode: appStore.appMode,
      },
      settings: settingsStore.data,
      notes: notesStore.notes,
    };
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
      const webSearchCommands =
        (await PluginWebSearch(this.buildPluginContext())?.addSearchResults?.(
          query,
        )) ?? [];

      // Check if the token is still valid (user hasn't typed something else)
      if (token !== this.buildCommandsToken) {
        return;
      }

      // Set flag to prevent infinite loop
      this.isUpdatingExternalSource = true;

      this.webSearchCommands = webSearchCommands.filter(
        (cmd) => cmd.value !== excludeResult,
      );
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
