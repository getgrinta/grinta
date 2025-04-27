<script lang="ts">
  import { goto } from "$app/navigation";
  import SegmentedControl from "$lib/components/segmented-control.svelte";
  import TopBar from "$lib/components/top-bar.svelte";
  import { appStore } from "$lib/store/app.svelte";
  import { settingsStore } from "$lib/store/settings.svelte";
  import humanizeString from "humanize-string";
  import { PressedKeys, watch } from "runed";
  import { _ } from "svelte-i18n";
  import packageJson from "../../../package.json" with { type: "json" };
  import { SUPPORTED_FILE_INDEXING_FILE_EXTENSIONS } from "$lib/grinta-invoke";
  import { toast } from "svelte-sonner";
  import { clipboardStore } from "$lib/store/clipboard.svelte";
  import {
    requestAccessibilityPermission,
    requestFullDiskAccessPermission,
  } from "tauri-plugin-macos-permissions-api";
  import {
    isEnabled as getIsAutostartEnabled,
    enable as enableAutostart,
  } from "@tauri-apps/plugin-autostart";
  import { onMount } from "svelte";
  import {
    ACCENT_COLOR,
    baseCurrencies,
    LANGUAGE_NATIVE_NAME,
    SEARCH_ENGINE,
    SEARCH_ENGINE_STYLED,
    THEME,
  } from "@getgrinta/core";
  import { commandsStore } from "$lib/store/commands.svelte";
  import Shortcut from "$lib/components/shortcut.svelte";
  import { calendarStore } from "$lib/store/calendar.svelte";
  import CalendarSettings from "$lib/components/settings/calendar-settings.svelte"; // Import the new component
  import { createForm } from "felte";
  import { validator } from "@felte/validator-zod";
  import { CustomQuickLinkSchema, type CustomQuickLink } from "@getgrinta/core";
  import { defaultQuickSearchModes } from "$lib/constants/quick-search";
  import { Trash2 } from "lucide-svelte";

  const pressedKeys = new PressedKeys();

  const baseTabs = [
    { label: $_("settings.tabs.general"), value: "general", hotkey: "⌘1" },
    { label: $_("settings.tabs.search"), value: "search", hotkey: "⌘2" },
    {
      label: $_("settings.tabs.permissions"),
      value: "permissions",
      hotkey: "⌘3",
    },
    { label: $_("settings.tabs.calendar"), value: "calendar", hotkey: "⌘4" },
    {
      label: $_("settings.tabs.quick_search"),
      value: "quicksearch",
      hotkey: "⌘5",
    },
  ];

  let extensionInput = $state<HTMLInputElement | null>(null);
  let currentTab = $state("general");
  let extensionValue = $state("");
  let isAutostartEnabled = $state(false);
  const themes = Object.keys(THEME);
  const accentColors = Object.keys(ACCENT_COLOR);

  const shortcutOptions = $derived.by(() => {
    const __ = settingsStore.data.language;

    return [
      {
        value: "CommandOrControl+Space",
        label: $_("settings.fields.shortcut_cmd_space"),
      },
      {
        value: "Option+Space",
        label: $_("settings.fields.shortcut_opt_space"),
      },
    ];
  });

  let selectedShortcut = $state(settingsStore.data.toggleShortcut);

  // Persist new shortcut
  $effect(() => {
    if (selectedShortcut === settingsStore.data.toggleShortcut) {
      return;
    }
    settingsStore.setToggleShortcut(selectedShortcut);
    settingsStore.persist();
  });

  function changeTab(tab: string) {
    currentTab = tab;
  }

  function updateNotesDir(event: Event) {
    const notesDirSplit = (event.target as HTMLInputElement).value.split("/");
    return settingsStore.setNotesDir(notesDirSplit);
  }

  const notesDirString = $derived(settingsStore.data.notesDir.join("/"));

  async function clearCommandHistory() {
    await commandsStore.clearHistory();
    return toast.success($_("settings.commandHistoryCleared"));
  }

  async function wipeLocalData() {
    await settingsStore.wipeLocalData();
    toast.success($_("settings.fields.localDataWiped"));
    return goto("/");
  }

  async function requestAccessibilityPermissions() {
    await requestAccessibilityPermission();
    await settingsStore.syncPermissions();
  }

  async function requestFsPermissions() {
    await requestFullDiskAccessPermission();
    await settingsStore.syncPermissions();
  }

  async function initialize() {
    isAutostartEnabled = await getIsAutostartEnabled();
  }

  async function requestAutostartPermission() {
    await enableAutostart();
    isAutostartEnabled = await getIsAutostartEnabled();
  }

  $effect(() => {
    settingsStore.syncPermissions();
  });

  $effect(() => {
    const _ = settingsStore.data.showWidgetLabels;
    settingsStore.persist();
  });

  watch(
    () => $state.snapshot(settingsStore.data),
    (before, after) => {
      if (!before || !after) return;

      // Clear clipboard history when clipboard recording is disabled
      if (
        before.clipboardRecordingEnabled &&
        !after.clipboardRecordingEnabled
      ) {
        clipboardStore.clearClipboardHistory();
        settingsStore.persist();
      }
    },
  );

  onMount(initialize);

  const isCmdPressed = $derived(pressedKeys.has("Meta"));

  const controls = $derived(
    baseTabs.map((tab, i) => ({
      text: $_(tab.label),
      onClick: () => changeTab(tab.value),
      active: currentTab === tab.value,
      shortcut: isCmdPressed ? tab.hotkey : undefined,
      hotkey: `Mod+${i + 1}`,
    })),
  );

  function addExtension(e?: Event) {
    e?.preventDefault();

    let extension = extensionValue.trim();
    if (!extension) return;
    if (!extension.startsWith(".")) {
      extension = `.${extension}`;
    }

    const extensionRegex = /^\.[a-zA-Z0-9]+$/;

    if (!extensionRegex.test(extension)) {
      toast.error($_("settings.extension_invalid_format"));
      return;
    }

    if (settingsStore.data.fsSearchAdditionalExtensions.includes(extension)) {
      toast.error($_("settings.extension_already_added"));
      return;
    }

    if (
      SUPPORTED_FILE_INDEXING_FILE_EXTENSIONS.includes(`*${extension}` as any)
    ) {
      toast.error($_("settings.extension_supported_by_default"));
      return;
    }

    settingsStore.setFsSearchAdditionalExtensions([
      ...settingsStore.data.fsSearchAdditionalExtensions,
      extension,
    ]);
    extensionValue = "";
    extensionInput?.focus();
  }

  // --- Quick Search Form Logic ---
  const { form, data, errors, reset } = createForm<CustomQuickLink>({
    extend: validator({ schema: CustomQuickLinkSchema }),
    onSubmit: async (values) => {
      // Check if shortcut conflicts with a default one (case-insensitive)
      const shortcutUpper = values.shortcut.toUpperCase();
      const defaultConflict = defaultQuickSearchModes.some(
        (mode) => mode.shortcut.toUpperCase() === shortcutUpper,
      );
      // Check if shortcut conflicts with an existing custom one (already handled by store, but good practice here too)
      const customConflict = settingsStore.data.customQuickLinks.some(
        (link) => link.shortcut.toUpperCase() === shortcutUpper,
      );

      if (defaultConflict || customConflict) {
        toast.error(
          $_("settings.quick_search.error_shortcut_conflict", {
            values: { shortcut: values.shortcut },
          }),
        );
        return;
      }

      // Attempt to add the link via the store
      const success = settingsStore.addCustomQuickLink(values);
      if (success) {
        toast.success($_("settings.quick_search.link_added"));
        reset(); // Clear the form
        settingsStore.persist(); // Persist changes
      } else {
        // This case might be redundant if the conflict check above is robust,
        // but handles potential race conditions or other store-level issues.
        toast.error(
          $_("settings.quick_search.error_add_failed", {
            values: { shortcut: values.shortcut },
          }),
        );
      }
    },
  });

  function removeCustomLink(shortcut: string) {
    settingsStore.removeCustomQuickLinkByShortcut(shortcut);
    settingsStore.persist();
    toast.success($_("settings.quick_search.link_removed"));
  }
  // --- End Quick Search Form Logic ---
</script>

<Shortcut keys={["meta", "1"]} callback={() => changeTab("general")} />
<Shortcut keys={["meta", "2"]} callback={() => changeTab("search")} />
<Shortcut keys={["meta", "3"]} callback={() => changeTab("permissions")} />
<Shortcut keys={["meta", "4"]} callback={() => changeTab("calendar")} />
<Shortcut keys={["meta", "5"]} callback={() => changeTab("quicksearch")} />

<TopBar>
  <div slot="input" class="grow flex-1 truncate text-lg font-semibold">
    {$_("settings.title")}
  </div>
  <div slot="addon" role="tablist">
    <SegmentedControl items={controls} alwaysShowLabels />
  </div>
</TopBar>

<div class="flex flex-1 flex-col gap-4 p-4">
  <div class="flex flex-1 flex-col mt-20 mb-8 mx-8">
    {#if currentTab === "general"}
      <form class="grid grid-cols-[1fr_2fr] gap-4 justify-center items-center">
        <label for="toggleShortcut" class="text-sm"
          >{$_("settings.fields.shortcut")}</label
        >
        <select
          id="toggleShortcutChoice"
          name="toggleShortcut"
          class="select select-bordered w-full"
          bind:value={selectedShortcut}
        >
          {#each shortcutOptions as option (option.value)}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
        <label for="appVersion" class="text-sm"
          >{$_("settings.fields.version")}</label
        >
        <div class="flex gap-2 items-center">
          <button type="button" id="appVersion" class="btn flex-1" disabled
            >{packageJson.version}</button
          >
          <button type="button" class="btn flex-1" onclick={appStore.updateApp}
            >{$_("settings.fields.checkForUpdate")}</button
          >
        </div>
        <label class="text-sm" for="themeChoice"
          >{$_("settings.fields.theme")}</label
        >
        <select
          id="themeChoice"
          name="theme"
          bind:value={settingsStore.data.theme}
          class="select select-bordered w-full"
        >
          {#each themes as theme}
            <option value={theme}>{humanizeString(theme)}</option>
          {/each}
        </select>
        <label class="text-sm" for="accentColorChoice"
          >{$_("settings.fields.accentColor")}</label
        >
        <select
          id="accentColorChoice"
          name="accentColor"
          bind:value={settingsStore.data.accentColor}
          class="select select-bordered w-full"
        >
          {#each accentColors as color}
            <option value={color}>{humanizeString(color)}</option>
          {/each}
        </select>

        <label class="text-sm" for="languageChoice"
          >{$_("settings.language")}</label
        >
        <select
          id="languageChoice"
          name="language"
          bind:value={settingsStore.data.language}
          class="select select-bordered w-full"
        >
          {#each Object.entries(LANGUAGE_NATIVE_NAME) as [code, name]}
            <option value={code}>{name}</option>
          {/each}
        </select>
        <label class="text-sm" for="clipboardChoice"
          >{$_("settings.clipboardRecordingEnabled")}</label
        >
        <input
          class="toggle toggle-lg toggle-primary"
          id="clipboardChoice"
          name="clipboardRecordingEnabled"
          type="checkbox"
          bind:checked={settingsStore.data.clipboardRecordingEnabled}
        />
        <label class="text-sm" for="showWidgetLabelsChoice"
          >{$_("settings.fields.showWidgetLabels")}</label
        >
        <input
          class="toggle toggle-lg toggle-primary"
          id="showWidgetLabelsChoice"
          name="showWidgetLabels"
          type="checkbox"
          bind:checked={settingsStore.data.showWidgetLabels}
        />
        <label class="text-sm" for="notesDirInput"
          >{$_("settings.fields.notesDirectory")}</label
        >
        <input
          id="notesDirInput"
          class="input w-full"
          name="notesDir"
          value={notesDirString}
          onchange={updateNotesDir}
        />
        <label for="dangerZone" class="text-sm"
          >{$_("settings.fields.dangerZone")}</label
        >
        <div id="dangerZone" class="flex gap-2">
          <button type="button" class="btn" onclick={clearCommandHistory}
            >{$_("settings.fields.clearCommandHistory")}</button
          >
          <button type="button" class="btn btn-warning" onclick={wipeLocalData}
            >{$_("settings.fields.wipeAllLocalData")}</button
          >
        </div>
      </form>
    {:else if currentTab === "search"}
      <form class="grid grid-cols-[1fr_2fr] gap-4 justify-center items-center">
        <h2 class="font-semibold col-span-2">
          {$_("settings.web")}
        </h2>
        <label class="text-sm" for="defaultSearchEngineChoice"
          >{$_("settings.fields.defaultSearchEngine")}</label
        >
        <select
          id="defaultSearchEngineChoice"
          name="theme"
          bind:value={settingsStore.data.defaultSearchEngine}
          class="select select-bordered w-full"
        >
          {#each Object.values(SEARCH_ENGINE) as searchEngine}
            <option value={searchEngine}
              >{SEARCH_ENGINE_STYLED[searchEngine]}</option
            >
          {/each}
        </select>
        <label class="text-sm" for="baseCurrencyChoice"
          >{$_("settings.fields.baseCurrency")}</label
        >
        <select
          id="baseCurrencyChoice"
          name="baseCurrency"
          bind:value={settingsStore.data.baseCurrency}
          class="select select-bordered w-full"
        >
          {#each baseCurrencies as baseCurrency}
            <option value={baseCurrency}>{baseCurrency}</option>
          {/each}
        </select>
        <h2 class="font-semibold col-span-2">
          {$_("settings.file")}
        </h2>
        <label class="text-sm" for="fsSearchOnlyInHomeChoice"
          >{$_("settings.fields.fsSearchOnlyInHome")}</label
        >
        <input
          class="toggle toggle-primary"
          id="fsSearchOnlyInHomeChoice"
          name="fsSearchOnlyInHome"
          type="checkbox"
          bind:checked={settingsStore.data.fsSearchOnlyInHome}
        />
        <label class="text-sm" for="fsSearchExtensionChoice"
          >{$_("settings.fields.additional_extensions")}</label
        >
        <div>
          <div class="mb-2 inline-block">
            {#each settingsStore.data.fsSearchAdditionalExtensions as extension}
              <div class="badge badge-outline border-neutral-500 mr-2 mb-2">
                {extension}
                <button
                  type="button"
                  class="btn-ghost cursor-pointer"
                  onclick={(e) => {
                    e.preventDefault();
                    settingsStore.removeFsSearchExtension(extension);
                  }}>x</button
                >
              </div>
            {/each}
          </div>
          <div class="flex gap-2">
            <input
              bind:this={extensionInput}
              type="text"
              placeholder="e.g. .txt"
              class="input flex-2/3"
              bind:value={extensionValue}
              onkeydown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addExtension();
                }
              }}
            />

            <button type="button" class="btn flex-1/3" onclick={addExtension}
              >{$_("settings.fields.add")}</button
            >
          </div>
        </div>
      </form>
    {:else if currentTab === "permissions"}
      <form class="grid grid-cols-[1fr_2fr] gap-4 justify-center items-center">
        <label class="text-sm"
          >{$_("settings.fields.accessibilityPermissions")}</label
        >
        <button
          class="btn"
          disabled={settingsStore.data.accessibilityPermissions}
          onclick={requestAccessibilityPermissions}
        >
          {settingsStore.data.accessibilityPermissions
            ? $_("settings.fields.granted")
            : $_("settings.fields.requestAccessibilityPermissions")}
        </button>
        <label class="text-sm">{$_("settings.fields.fsPermissions")}</label>
        <button
          class="btn"
          disabled={settingsStore.data.fsPermissions}
          onclick={requestFsPermissions}
          >{settingsStore.data.fsPermissions
            ? $_("settings.fields.granted")
            : $_("settings.fields.requestFsPermissions")}</button
        >
        <label class="text-sm">{$_("settings.fields.autostart")}</label>
        <button
          class="btn"
          disabled={isAutostartEnabled}
          onclick={requestAutostartPermission}
        >
          {isAutostartEnabled
            ? $_("settings.fields.granted")
            : $_("settings.fields.requestAutostart")}
        </button>
      </form>
    {:else if currentTab === "calendar"}
      <CalendarSettings />
    {:else if currentTab === "quicksearch"}
      <div class="p-4 space-y-6">
        <!-- Default Quick Search Links -->
        <div class="space-y-3">
          <h2 class="text-lg font-semibold">
            {$_("settings.quick_search.default_links_title")}
          </h2>
          <ul class="space-y-2">
            {#each defaultQuickSearchModes as mode (mode.shortcut)}
              <li
                class="flex items-center justify-between p-2 border rounded bg-secondary"
              >
                <div class="flex items-center space-x-2">
                  <span
                    class="flex items-center justify-center w-6 h-6 text-xs font-bold rounded {mode.bgColorClass} {mode.textColorClass}"
                  >
                    {mode.shortcut}
                  </span>
                  <span>{mode.name}</span>
                </div>
                <span class="text-sm text-muted"
                  >({$_("settings.quick_search.default")})</span
                >
              </li>
            {/each}
          </ul>
        </div>

        <!-- Custom Quick Search Links -->
        <div class="space-y-3">
          <h2 class="text-lg font-semibold">
            {$_("settings.quick_search.custom_links_title")}
          </h2>
          {#if settingsStore.data.customQuickLinks.length > 0}
            <ul class="space-y-2">
              {#each settingsStore.data.customQuickLinks as link (link.shortcut)}
                <li
                  class="flex items-center justify-between p-2 border rounded bg-secondary"
                >
                  <div class="flex items-center space-x-2">
                    <span
                      class="flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-gray-500 rounded"
                    >
                      {link.shortcut}
                    </span>
                    <span>{link.name}</span>
                    <span class="text-xs text-muted">({link.urlTemplate})</span>
                  </div>
                  <button
                    onclick={() => removeCustomLink(link.shortcut)}
                    class="p-1 text-red-500 rounded hover:bg-destructive/20"
                    title={$_("settings.quick_search.remove_link_tooltip")}
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              {/each}
            </ul>
          {:else}
            <p class="text-sm text-muted">
              {$_("settings.quick_search.no_custom_links")}
            </p>
          {/if}
        </div>

        <!-- Add New Custom Link Form -->
        <div class="space-y-3 pt-4 border-t">
          <h2 class="text-lg font-semibold">
            {$_("settings.quick_search.add_new_link_title")}
          </h2>
          <form use:form class="space-y-4">
            <div class="grid grid-cols-3 gap-4">
              <!-- Shortcut -->
              <div>
                <label
                  for="shortcut"
                  class="block text-sm font-medium text-muted"
                >
                  {$_("settings.quick_search.form_shortcut_label")}
                </label>
                <input
                  type="text"
                  name="shortcut"
                  id="shortcut"
                  maxlength="1"
                  class="w-full input {$errors.shortcut
                    ? 'border-destructive'
                    : ''}"
                  placeholder={$_(
                    "settings.quick_search.form_shortcut_placeholder",
                  )}
                />
                {#if $errors.shortcut}
                  <p class="mt-1 text-xs text-destructive">
                    {$errors.shortcut[0]}
                  </p>
                {/if}
              </div>

              <!-- Name -->
              <div class="col-span-2">
                <label for="name" class="block text-sm font-medium text-muted">
                  {$_("settings.quick_search.form_name_label")}
                </label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  class="w-full input {$errors.name
                    ? 'border-destructive'
                    : ''}"
                  placeholder={$_(
                    "settings.quick_search.form_name_placeholder",
                  )}
                />
                {#if $errors.name}
                  <p class="mt-1 text-xs text-destructive">{$errors.name[0]}</p>
                {/if}
              </div>
            </div>

            <!-- URL Template -->
            <div>
              <label
                for="urlTemplate"
                class="block text-sm font-medium text-muted"
              >
                {$_("settings.quick_search.form_url_template_label")}
              </label>
              <input
                type="text"
                name="urlTemplate"
                id="urlTemplate"
                class="w-full input {$errors.urlTemplate
                  ? 'border-destructive'
                  : ''}"
                placeholder={$_(
                  "settings.quick_search.form_url_template_placeholder",
                )}
              />
              <p class="mt-1 text-xs text-muted">
                {$_("settings.quick_search.form_url_template_hint")}
              </p>
              {#if $errors.urlTemplate}
                <p class="mt-1 text-xs text-destructive">
                  {$errors.urlTemplate[0]}
                </p>
              {/if}
            </div>

            <button type="submit" class="btn btn-primary">
              {$_("settings.quick_search.add_button")}
            </button>
          </form>
        </div>
      </div>
    {/if}
  </div>
</div>
