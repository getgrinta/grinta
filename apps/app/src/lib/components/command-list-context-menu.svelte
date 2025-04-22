<script lang="ts">
  import { commandsStore } from "$lib/store/commands.svelte";
  import { widgetsStore } from "$lib/store/widgets.svelte";
  import { Command } from "@tauri-apps/plugin-shell";
  import { CopyIcon, PinIcon, XIcon } from "lucide-svelte";
  import { EyeIcon, FolderIcon, TextIcon } from "lucide-svelte";
  import { _ } from "svelte-i18n";
  import { get } from "svelte/store";
  import ContextMenu from "./context-menu.svelte";
  import type { MenuItem } from "./context-menu.svelte";
  import {
    APP_MODE,
    COMMAND_HANDLER,
    type ExecutableCommand,
  } from "@getgrinta/core";
  import { settingsStore } from "$lib/store/settings.svelte";
  import * as PathApi from "@tauri-apps/api/path";
  import { notesStore } from "$lib/store/notes.svelte";
  import { appStore } from "$lib/store/app.svelte";

  let contextMenuItems = $state<MenuItem[]>([]);

  function t(key: string, params: Record<string, string> = {}) {
    try {
      const translationFn = get(_);
      return translationFn(key, { values: params });
    } catch {
      return key;
    }
  }

  async function handleHideEvent(command: ExecutableCommand) {
    const eventId = command.metadata?.calendarSchema?.eventId;
    if (!eventId) {
      console.error("Event ID missing or invalid for handleHideEvent");
      return;
    }
    const currentSettings = settingsStore.data;
    if (!Array.isArray(currentSettings.ignoredEventIds)) {
      currentSettings.ignoredEventIds = []; // Initialize if not an array
    }
    if (!currentSettings.ignoredEventIds.includes(eventId)) {
      settingsStore.data.ignoredEventIds = [
        ...currentSettings.ignoredEventIds,
        eventId,
      ];

      settingsStore.persist();
    }
  }

  async function handleHideCalendar(command: ExecutableCommand) {
    const calendarId = command.metadata?.calendarSchema?.calendarIdentifier;
    if (!calendarId) {
      console.error("Calendar ID missing or invalid for handleHideCalendar");
      return;
    }
    const currentSettings = settingsStore.data;
    if (!Array.isArray(currentSettings.selectedCalendarIdentifiers)) {
      currentSettings.selectedCalendarIdentifiers = []; // Initialize if not an array
    }
    const updatedIdentifiers =
      currentSettings.selectedCalendarIdentifiers.filter(
        (id: string) => id !== calendarId,
      );
    if (
      updatedIdentifiers.length !==
      currentSettings.selectedCalendarIdentifiers.length
    ) {
      settingsStore.data.selectedCalendarIdentifiers = updatedIdentifiers;
      settingsStore.persist();
    }
  }

  export function createContextMenuItems(
    command: ExecutableCommand,
    isWidget: boolean,
  ) {
    const menuItems: MenuItem[] = [];

    if (!isWidget && command.handler !== COMMAND_HANDLER.CALENDAR) {
      menuItems.push({
        label: t("commands.contextMenu.pin"),
        icon: PinIcon as any,
        onClick: () =>
          widgetsStore.addWidget({
            type: "command",
            data: command,
          }),
      });
    }

    if (command.metadata?.ranAt) {
      menuItems.push({
        label: t("commands.contextMenu.remove"),
        icon: XIcon as any,
        onClick: async () => {
          if (
            command.handler === COMMAND_HANDLER.OPEN_NOTE &&
            appStore.appMode === APP_MODE.NOTES
          ) {
            await notesStore.deleteNote(command.value);
          }
          await commandsStore.removeHistoryEntry(command);
          commandsStore.buildCommands({ isRefresh: false });
        },
      });
    }

    if (command.handler === COMMAND_HANDLER.OPEN_NOTE) {
      // Show in finder
      menuItems.push({
        label: t("commands.contextMenu.showInFinder"),
        icon: EyeIcon as any,
        onClick: async () => {
          const homePath = await PathApi.homeDir();
          const fullPath = await PathApi.join(
            homePath,
            ...settingsStore.data.notesDir,
            command.value,
          );

          Command.create("open", ["-R", fullPath]).execute();
        },
      });
    }

    if (command.handler === COMMAND_HANDLER.APP) {
      menuItems.push({
        label: t("commands.contextMenu.open"),
        icon: FolderIcon as any,
        onClick: () => {
          const path = command.metadata?.path;

          if (!path) {
            return;
          }

          let pathToOpen = path;
          const lastSlash = pathToOpen.lastIndexOf("/");
          if (
            lastSlash !== -1 &&
            command.metadata?.contentType !== "public.folder"
          ) {
            pathToOpen = pathToOpen.substring(0, lastSlash);
          }

          Command.create("open", [pathToOpen]).execute();
        },
      });
    }

    if (
      command.handler === COMMAND_HANDLER.FS_ITEM ||
      command.handler === COMMAND_HANDLER.APP
    ) {
      menuItems.push({
        label: t("commands.contextMenu.showInFinder"),
        icon: EyeIcon as any,
        onClick: () => {
          const path = command.metadata?.path;

          if (!path) {
            return;
          }

          Command.create("open", ["-R", path]).execute();
        },
      });

      menuItems.push({
        label: t("commands.contextMenu.quickLook"),
        icon: EyeIcon as any,
        onClick: () => {
          const path = command.metadata?.path;

          if (!path) {
            return;
          }

          Command.create("qlmanage", ["-p", path]).execute();
        },
      });

      menuItems.push({
        label: t("commands.contextMenu.getInfo"),
        icon: TextIcon as any,
        onClick: () => {
          const path = command.metadata?.path;

          if (!path) {
            return;
          }

          Command.create("osascript", [
            "-e",
            `tell application "Finder" to open information window of file (POSIX file "${path}")`,
          ]).execute();
        },
      });

      if (command.localizedLabel || command.label) {
        menuItems.push({
          label: t("commands.contextMenu.copyName"),
          icon: CopyIcon as any,
          onClick: () => {
            const { label, localizedLabel } = command;

            const targetLabel = localizedLabel || label;
            if (!targetLabel) {
              return;
            }

            navigator.clipboard.writeText(targetLabel);
          },
        });
      }

      if (command.metadata?.path) {
        menuItems.push({
          label: t("commands.contextMenu.copyPath"),
          icon: CopyIcon as any,
          onClick: () => {
            const path = command.metadata.path;

            if (!path) {
              return;
            }

            navigator.clipboard.writeText(path);
          },
        });
      }
    }

    if (command.handler === COMMAND_HANDLER.CALENDAR) {
      menuItems.push({
        label: t("commands.contextMenu.hideEvent"),
        icon: XIcon as any,
        onClick: () => handleHideEvent(command),
      });

      menuItems.push({
        label: t("commands.contextMenu.hideCalendar"),
        icon: XIcon as any,
        onClick: () => handleHideCalendar(command),
      });
    }

    contextMenuItems = menuItems;
  }
</script>

<ContextMenu name="commandList" items={contextMenuItems} />
