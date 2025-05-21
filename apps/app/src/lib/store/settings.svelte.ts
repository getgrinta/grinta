import {
  type ShortcutEvent,
  register,
  unregisterAll,
} from "@tauri-apps/plugin-global-shortcut";
import { activateWindow } from "../utils.svelte";
import { appStore } from "./app.svelte";
import { commandsStore } from "./commands.svelte";
import { notesStore } from "./notes.svelte";
import { SecureStore } from "./secure.svelte";
import {
  checkAccessibilityPermission,
  checkFullDiskAccessPermission,
} from "tauri-plugin-macos-permissions-api";
import { activateAppByName, getLastFocusedWindowName } from "../grinta-invoke";
import { SettingsSchema } from "@getgrinta/core";
import { z } from "zod/v3";
import type { CustomQuickLink } from "@getgrinta/core";

// Infer the Settings type directly from the schema
type Settings = z.infer<typeof SettingsSchema>;

async function toggleShortcutHandler(event: ShortcutEvent) {
  if (!appStore.appWindow) return;
  if (event.state !== "Pressed") return;
  const visible = await appStore.appWindow.isVisible();

  if (!visible) {
    const name = await getLastFocusedWindowName();
    appStore.setLastFocusedWindowName(name);
    await activateWindow();
    const searchBar = document.getElementById("searchBar");
    return searchBar?.focus();
  }

  if (appStore.lastFocusedWindowName) {
    await activateAppByName(appStore.lastFocusedWindowName);
  }
  return appStore.appWindow?.hide();
}

export class SettingsStore extends SecureStore<Settings> {
  async initialize() {
    await this.restore();
    await this.syncPermissions();
    await this.registerShortcuts();
  }

  async syncPermissions() {
    const accessibilityPermissions = await checkAccessibilityPermission();
    const fsPermissions = await checkFullDiskAccessPermission();
    this.updateData({ accessibilityPermissions, fsPermissions });
  }

  async registerShortcuts() {
    await register(this.data.toggleShortcut, toggleShortcutHandler);
  }

  async unregisterShortcuts() {
    await unregisterAll();
  }

  toggleIncognito() {
    this.updateData({ incognitoEnabled: !this.data.incognitoEnabled });
  }

  finishOnboarding() {
    this.updateData({ onboardingCompleted: true });
  }

  setFsSearchAdditionalExtensions(fsSearchAdditionalExtensions: string[]) {
    this.updateData({ fsSearchAdditionalExtensions });
  }

  removeFsSearchExtension(extension: string) {
    const updatedExtensions = this.data.fsSearchAdditionalExtensions.filter(
      (ext) => ext !== extension,
    );
    this.updateData({ fsSearchAdditionalExtensions: updatedExtensions });
  }

  async setToggleShortcut(toggleShortcut: string) {
    await this.unregisterShortcuts();
    this.updateData({ toggleShortcut });
    await this.registerShortcuts();
  }

  async setNotesDir(notesDir: string[]) {
    this.updateData({ notesDir });
  }

  async wipeLocalData() {
    await notesStore.clearNotes();
    await commandsStore.clearHistory();
  }

  addCustomQuickLink(link: CustomQuickLink) {
    // Ensure shortcut doesn't already exist (case-insensitive check)
    const shortcutUpper = link.shortcut.toUpperCase();
    const exists = this.data.customQuickLinks.some(
      (existingLink) => existingLink.shortcut.toUpperCase() === shortcutUpper,
    );

    if (exists) {
      console.warn(
        `Custom quick link with shortcut "${link.shortcut}" already exists.`,
      );
      // Optionally throw an error or return a status
      return false;
    }

    const updatedLinks = [...this.data.customQuickLinks, link];
    this.updateData({ customQuickLinks: updatedLinks });
    return true;
  }

  removeCustomQuickLinkByShortcut(shortcutToRemove: string) {
    const shortcutUpper = shortcutToRemove.toUpperCase();
    const updatedLinks = this.data.customQuickLinks.filter(
      (link) => link.shortcut.toUpperCase() !== shortcutUpper,
    );
    this.updateData({ customQuickLinks: updatedLinks });
  }
}

export const settingsStore = new SettingsStore({
  schema: SettingsSchema,
  fileName: "settings.json",
  storageKey: "settings",
});
