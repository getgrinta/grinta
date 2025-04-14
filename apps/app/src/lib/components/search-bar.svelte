<script lang="ts">
  import { goto } from "$app/navigation";
  import SegmentedControl from "$lib/components/segmented-control.svelte";
  import TopBar from "$lib/components/top-bar.svelte";
  import { appMetadataStore } from "$lib/store/app-metadata.svelte";
  import { appStore } from "$lib/store/app.svelte";
  import { commandsStore } from "$lib/store/commands.svelte";
  import { notesStore } from "$lib/store/notes.svelte";
  import { settingsStore } from "$lib/store/settings.svelte";
  import { APP_MODE, type AppMode } from "@getgrinta/core";
  import { listen } from "@tauri-apps/api/event";
  import { clsx } from "clsx";
  import { createForm } from "felte";
  import {
    ChevronLeftIcon,
    ClipboardIcon,
    EyeIcon,
    EyeOffIcon,
    SearchIcon,
    StickyNoteIcon,
    XIcon,
  } from "lucide-svelte";
  import { watch } from "runed";
  import { _ } from "svelte-i18n";
  import { match } from "ts-pattern";
  import ViewActions from "./view-actions.svelte";
  import SidebarMenuButton from "./sidebar-menu-button.svelte";
  import { shortcut, type ShortcutTrigger } from "@svelte-put/shortcut";

  let queryInput: HTMLInputElement;

  async function handleGrintAi() {
    return goto(`/ai/${appStore.query}`);
  }

  const INDICATOR_MODES = [
    {
      value: APP_MODE.INITIAL,
      icon: SearchIcon,
      shortcut: "⌘1",
      hotkey: "Mod+1",
    },
    {
      value: APP_MODE.NOTES,
      icon: StickyNoteIcon,
      shortcut: "⌘2",
      hotkey: "Mod+2",
    },
  ];

  const baseShortcuts: ShortcutTrigger[] = [
    {
      key: "1",
      modifier: ["ctrl", "meta"],
      callback: () => switchMode(APP_MODE.INITIAL),
    },
    {
      key: "2",
      modifier: ["ctrl", "meta"],
      callback: () => switchMode(APP_MODE.NOTES),
    },
    {
      key: "p",
      modifier: ["ctrl", "meta"],
      callback: () => settingsStore.toggleIncognito(),
    },
    {
      key: "n",
      modifier: ["ctrl", "meta"],
      callback: createNote,
    },
  ];

  const authenticatedShortcuts: ShortcutTrigger[] = [
    ...baseShortcuts,
    {
      key: "l",
      modifier: ["ctrl", "meta"],
      callback: () => {
        if (appStore.query.length < 4) return;
        return goto(`/ai/${appStore.query}`);
      },
    },
  ];

  const shortcuts: ShortcutTrigger[] = appStore.user?.id
    ? authenticatedShortcuts
    : baseShortcuts;

  const searchViewActions = appStore.user?.id
    ? [
        {
          label: $_("search.grintai"),
          onclick: handleGrintAi,
          shortcut: "⌘L",
        },
      ]
    : [];

  const { form } = createForm({
    async onSubmit() {
      return commandsStore.handleCommand({
        command: commandsStore.currentCommand,
      });
    },
  });

  let clearQueryTimeoutToken: NodeJS.Timeout | null = null;

  listen("main_panel_did_resign_key", () => {
    const timeout = 30 * 60 * 1000; // 30 minutes

    if (clearQueryTimeoutToken) {
      clearTimeout(clearQueryTimeoutToken);
    }

    clearQueryTimeoutToken = setTimeout(() => {
      appStore.setQuery("");
    }, timeout);
  });

  $effect(() => {
    if (appStore.menuOpen) {
      return queryInput?.blur();
    }
    return queryInput?.focus();
  });

  listen("main_panel_did_become_key", () => {
    if (clearQueryTimeoutToken) {
      clearTimeout(clearQueryTimeoutToken);
    }
  });

  listen("focus", () => {
    queryInput?.focus();

    if (appStore.appMode !== APP_MODE.INITIAL) {
      switchMode(APP_MODE.INITIAL);
    }
  });

  function switchMode(mode: AppMode) {
    return goto(`/commands/${mode}`);
  }

  async function createNote() {
    const filename = await notesStore.createNote(
      appStore.query.length > 0 ? appStore.query : undefined,
    );
    return goto(`/notes/${filename}`);
  }

  async function handleNavigation(event: KeyboardEvent) {
    if (event.key === "ArrowDown" || (event.key === "j" && event.ctrlKey)) {
      event.preventDefault();
      if (commandsStore.selectedIndex === undefined) return;
      if (commandsStore.selectedIndex === commandsStore.commands.length - 1) {
        commandsStore.selectedIndex = 0;
        return;
      }
      commandsStore.selectedIndex = commandsStore.selectedIndex + 1;
      return;
    }
    if (event.key === "ArrowUp" || (event.key === "k" && event.ctrlKey)) {
      event.preventDefault();
      if (commandsStore.selectedIndex === undefined) return;
      if (commandsStore.selectedIndex === 0) {
        commandsStore.selectedIndex = commandsStore.commands.length - 1;
        return;
      }
      commandsStore.selectedIndex = commandsStore.selectedIndex - 1;
      return;
    }
    if (event.key === "Backspace" && appStore.query.length === 0) {
      appStore.appMode = APP_MODE.INITIAL;
      return;
    }
  }

  async function buildCommands() {
    return commandsStore.buildCommands({
      isRefresh: false,
    });
  }

  async function buildAppCommandsAndAppIcons() {
    await commandsStore.buildAppCommands();
    await commandsStore.buildCommands({
      isRefresh: true,
    });
  }

  watch(
    () => [appStore.query, appStore.appMode],
    () => {
      buildCommands();
      setTimeout(() => {
        queryInput?.focus();
      }, 50);
    },
  );

  watch(
    () => {
      return Object.keys(appMetadataStore.appInfo).length;
    },
    (prev, next) => {
      if (prev !== next) {
        buildAppCommandsAndAppIcons();
      }
    },
  );

  const inputProps = $derived(
    match(appStore.appMode)
      .with(APP_MODE.INITIAL, () => ({
        icon: SearchIcon,
        placeholder: $_("searchBar.placeholder.initial"),
      }))
      .with(APP_MODE.NOTES, () => ({
        icon: StickyNoteIcon,
        placeholder: $_("searchBar.placeholder.notes"),
      }))
      .with(APP_MODE.CLIPBOARD, () => ({
        icon: ClipboardIcon,
        placeholder: $_("searchBar.placeholder.clipboard"),
      }))
      .exhaustive(),
  );

  const indicatorButton = $derived(
    match(appStore.appMode)
      .with(APP_MODE.INITIAL, () =>
        appStore.query.length > 0
          ? {
              icon: XIcon,
              onClick: () => appStore.setQuery(""),
            }
          : settingsStore.data.incognitoEnabled
            ? {
                icon: EyeOffIcon,
                onClick: () => settingsStore.toggleIncognito(),
                active: true,
                hotkey: "Mod+p",
              }
            : {
                icon: EyeIcon,
                onClick: () => settingsStore.toggleIncognito(),
                active: false,
                hotkey: "Mod+p",
              },
      )
      .otherwise(() => ({
        icon: ChevronLeftIcon,
        onClick: () => goto("/commands/INITIAL"),
        active: false,
        hotkey: "Mod+p",
      })),
  );
</script>

<svelte:window
  use:shortcut={{
    trigger: shortcuts,
  }}
/>

<form use:form>
  <TopBar>
    <div slot="indicator">
      <button
        type="button"
        class={clsx("btn btn-sm", indicatorButton.active && "btn-primary")}
        onclick={indicatorButton.onClick}
      >
        <indicatorButton.icon size={16} class={clsx("pointer-events-none")} />
      </button>
    </div>
    <input
      bind:this={queryInput}
      id="searchBar"
      slot="input"
      class="grow font-semibold text-lg !outline-none"
      name="query"
      bind:value={appStore.query}
      onkeydown={handleNavigation}
      placeholder={inputProps.placeholder}
      autocomplete="off"
      spellcheck="false"
      data-testid="search-bar"
    />
    <div slot="addon" class="flex items-center gap-1">
      {#if appStore.appMode === APP_MODE.INITIAL && appStore.query.length >= 3}
        <ViewActions actions={searchViewActions} size="sm" />
      {:else if appStore.query.length === 0}
        <SegmentedControl
          items={INDICATOR_MODES.map((mode) => ({
            text: $_(`barMode.${mode.value.toLowerCase()}`),
            icon: mode.icon,
            active: mode.value === appStore.appMode,
            shortcut: mode.shortcut,
            hotkey: mode.hotkey,
            testId: `search-bar-mode-${mode.value.toLowerCase()}`,
            onClick: () => switchMode(mode.value),
          }))}
          showLabelOnHover
        />
      {/if}
      <SidebarMenuButton />
    </div>
  </TopBar>
</form>
