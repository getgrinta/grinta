<script lang="ts">
  import { goto } from "$app/navigation";
  import TopBar from "$lib/components/top-bar.svelte";
  import { appMetadataStore } from "$lib/store/app-metadata.svelte";
  import { appStore } from "$lib/store/app.svelte";
  import { commandsStore } from "$lib/store/commands.svelte";
  import { notesStore } from "$lib/store/notes.svelte";
  import { settingsStore } from "$lib/store/settings.svelte";
  import { accessoryStore } from "$lib/store/accessory.svelte";
  import {
    APP_MODE,
    type AppMode,
    type CustomQuickLink,
  } from "@getgrinta/core";
  import { listen } from "@tauri-apps/api/event";
  import { clsx } from "clsx";
  import { createForm } from "felte";
  import {
    ArrowRightToLineIcon,
    CalendarIcon,
    ChevronLeftIcon,
    ClipboardIcon,
    SearchIcon,
    StickyNoteIcon,
    XIcon,
  } from "lucide-svelte";
  import { watch } from "runed";
  import { _ } from "svelte-i18n";
  import { match } from "ts-pattern";
  import ViewActions from "./view-actions.svelte";
  import SidebarMenuButton from "./sidebar/sidebar-menu-button.svelte";
  import { shortcut, type ShortcutTrigger } from "@svelte-put/shortcut";
  import { calendarStore } from "$lib/store/calendar.svelte";
  import { openUrl } from "@tauri-apps/plugin-opener";
  import {
    defaultQuickSearchModes,
    type QuickSearchMode,
  } from "$lib/constants/quick-search";
  import { blur, crossfade, fade, fly, slide } from "svelte/transition";
  import { sineOut } from "svelte/easing";

  const INPUT_PLACEHOLDERS = [
    "Start browsing the web",
    "Find files on your computer",
    "Type anything and click Tab to ask the AI",
    "See upcoming events in Calendar",
    "Need to write things down? Open Notes",
  ];

  let queryInput: HTMLInputElement;
  let placeholder = $state(getRandomPlaceholder());
  let placeholderInterval = $state<NodeJS.Timeout | number>();

  function getRandomPlaceholder() {
    return INPUT_PLACEHOLDERS[
      Math.floor(Math.random() * INPUT_PLACEHOLDERS.length)
    ];
  }

  // Combine default and custom quick links, overriding defaults with customs
  const combinedQuickSearchModes = $derived(() => {
    const customLinksMap = new Map<string, QuickSearchMode>();
    settingsStore.data.customQuickLinks.forEach(
      (customLink: CustomQuickLink) => {
        const shortcutUpper = customLink.shortcut.toUpperCase();
        customLinksMap.set(shortcutUpper, {
          shortcut: shortcutUpper,
          name: customLink.name,
          // Assign default styling for custom links
          bgColorClass: "gray-500",
          textColorClass: "text-white",
          searchUrl: (query: string) =>
            customLink.urlTemplate.replace(
              "{query}",
              encodeURIComponent(query),
            ),
        });
      },
    );

    // Add defaults only if not overridden by a custom link
    const defaultsToAdd = defaultQuickSearchModes.filter(
      (defaultMode) => !customLinksMap.has(defaultMode.shortcut.toUpperCase()),
    );

    return [...defaultsToAdd, ...customLinksMap.values()];
  });

  let quickSearchBadge: HTMLDivElement | null = $state(null);
  const leftPadding = $derived.by(() => {
    const _ = appStore.quickSearchMode;

    if (!quickSearchBadge || !appStore.quickSearchMode) return "0";
    return ((quickSearchBadge?.clientWidth ?? 0) + 15).toFixed(0);
  });

  async function handleGrintAi() {
    return goto(`/ai/${appStore.query}`);
  }

  async function createNote() {
    const id = await notesStore.createNote(appStore.query);
    await notesStore.openNote(id);
    await switchMode(APP_MODE.INITIAL);
    appStore.setQuery("");
    return goto("/");
  }

  let baseShortcuts: ShortcutTrigger[] = [
    {
      key: "p",
      modifier: ["meta"],
      callback: () => settingsStore.toggleIncognito(),
    },
    {
      key: "n",
      modifier: ["meta"],
      callback: createNote,
    },
  ];

  // Widget shortcuts in a loop
  for (let i = 0; i <= 9; i++) {
    baseShortcuts.push({
      key: i.toString(),
      modifier: ["ctrl"],
      callback: () => {
        onWidgetShortcut?.(i);
      },
      preventDefault: true,
    });
  }

  const shortcuts: ShortcutTrigger[] = baseShortcuts;

  const searchViewActions = [
    {
      label: $_("search.grintai"),
      onclick: handleGrintAi,
      icon: ArrowRightToLineIcon,
    },
  ];

  const notesViewActions = [
    {
      label: "⌘N " + $_("notes.createNote"),
      onclick: createNote,
    },
  ];

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
      accessoryStore.clearMode();
      appStore.quickSearchMode = null;
    }, timeout);
  });

  $effect(() => {
    if (appStore.menuOpen) {
      return queryInput?.blur();
    }
    return queryInput?.focus();
  });

  // App was shown
  listen("main_panel_did_become_key", () => {
    if (clearQueryTimeoutToken) {
      clearTimeout(clearQueryTimeoutToken);
    }

    calendarStore.refetchEventsIfAuthorized();
  });

  listen("focus", () => {
    queryInput?.focus();

    if (appStore.appMode !== APP_MODE.INITIAL) {
      switchMode(APP_MODE.INITIAL);
    }
  });

  const { onWidgetShortcut } = $props<{
    onWidgetShortcut?: (index: number) => void;
  }>();

  function switchMode(mode: AppMode) {
    return goto(`/commands/${mode}`);
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
      // Clear quick link
      if (appStore.quickSearchMode) {
        event.preventDefault();
        appStore.quickSearchMode = null;
        appStore.query = "";
        return;
      }

      appStore.appMode = APP_MODE.INITIAL;
      return;
    }

    if (appStore.appMode === APP_MODE.INITIAL) {
      if (event.key == "Enter" && appStore.quickSearchMode) {
        event.preventDefault();

        const url = appStore.quickSearchMode.searchUrl(appStore.query);
        openUrl(url);
        // Reset state after search
        appStore.quickSearchMode = null;
        appStore.query = "";
        return;
      }

      if (event.key === "Tab") {
        event.preventDefault();

        // save special mode
        if (appStore.query.length >= 1 && appStore.query.length <= 2) {
          const shortcutString = appStore.query
            .slice(0, 2)
            .trim()
            .toUpperCase(); // Ensure uppercase for matching

          const mode = combinedQuickSearchModes().find(
            (m: QuickSearchMode) => m.shortcut.toUpperCase() === shortcutString,
          );

          if (mode) {
            appStore.quickSearchMode = mode;
            appStore.query = ""; // Clear query after setting mode
          }

          return;
        }

        if (appStore.query.length < 4 || appStore.quickSearchMode) return;
        return goto(`/ai/${appStore.query}`);
      }
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
      accessoryStore.consume(appStore.query);
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

  const inputProps = $derived.by(() => {
    if (appStore.quickSearchMode && appStore.appMode === APP_MODE.INITIAL) {
      const hostname = new URL(appStore.quickSearchMode.searchUrl("")).hostname;
      const placeholder = $_("settings.quick_search.openIn").replace(
        "{hostname}",
        hostname,
      );
      return {
        icon: SearchIcon,
        placeholder: placeholder,
      };
    }

    return match(appStore.appMode)
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
      .with(APP_MODE.CALENDAR, () => ({
        icon: CalendarIcon,
        placeholder: $_("searchBar.placeholder.calendar"),
      }))
      .exhaustive();
  });

  const indicatorButton = $derived(
    match(appStore.appMode)
      .with(APP_MODE.INITIAL, () =>
        appStore.query.length > 0
          ? {
              icon: XIcon,
              tooltip: $_("common.clear"),
              onClick: () => appStore.setQuery(""),
            }
          : undefined,
      )
      .otherwise(() => ({
        icon: ChevronLeftIcon,
        tooltip: $_("common.back"),
        onClick: () => goto("/commands/INITIAL"),
        active: false,
        hotkey: "Mod+p",
      })),
  );

  async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  watch(
    () => appStore.visible,
    () => {
      const clearPlaceholderInterval = () => {
        clearInterval(placeholderInterval);
        placeholderInterval = undefined;
        placeholder = "";
      };
      const setPlaceholder = async () => {
        placeholder = "";
        await sleep(1000);
        placeholder = getRandomPlaceholder();
      };
      if (appStore.visible) {
        clearPlaceholderInterval();
        setPlaceholder();
        placeholderInterval = setInterval(setPlaceholder, 7000);
      } else {
        clearPlaceholderInterval();
      }
      return () => {
        clearPlaceholderInterval();
      };
    },
  );
</script>

<svelte:window
  use:shortcut={{
    trigger: shortcuts,
  }}
/>

<form use:form>
  <TopBar>
    {#snippet indicator()}
      {#if indicatorButton}
        <div class="tooltip tooltip-bottom" data-tip={indicatorButton.tooltip}>
          <button
            type="button"
            class={clsx("btn btn-sm btn-square border-gradient")}
            onclick={indicatorButton.onClick}
          >
            <indicatorButton.icon
              size={16}
              class={clsx("pointer-events-none")}
            />
          </button>
        </div>
      {/if}
    {/snippet}
    {#snippet input()}
      <div class="relative flex grow items-center">
        <input
          bind:this={queryInput}
          id="searchBar"
          class={clsx("grow font-semibold text-lg !outline-none")}
          style="padding-left: {leftPadding}px;"
          name="query"
          bind:value={appStore.query}
          onkeydown={handleNavigation}
          placeholder={appStore.appMode !== APP_MODE.INITIAL
            ? inputProps.placeholder
            : ""}
          autocomplete="off"
          spellcheck="false"
          data-testid="search-bar"
        />
        {#if appStore.visible && appStore.appMode === APP_MODE.INITIAL && appStore.query.length === 0}
          <div
            class="absolute flex left-0 top-0 text-lg gap-1 pointer-events-none text-base-content/50"
          >
            {#each placeholder.split(" ") as word, index}
              <span
                in:blur={{ delay: index * 150, easing: sineOut }}
                out:blur={{ easing: sineOut }}>{word}</span
              >
            {/each}
          </div>
        {/if}
        {#if appStore.quickSearchMode && appStore.appMode === APP_MODE.INITIAL}
          <div
            bind:this={quickSearchBadge}
            class={clsx(
              "badge absolute left-0 top-1/2 -translate-y-1/2 z-10 pointer-events-none",
              `bg-${appStore.quickSearchMode.bgColorClass}`,
              appStore.quickSearchMode.textColorClass,
              `shadow-${appStore.quickSearchMode.bgColorClass}/50 border-0 shadow-lg`,
            )}
          >
            {appStore.quickSearchMode.name}
          </div>
        {/if}
      </div>
    {/snippet}
    {#snippet addon()}
      <div class="flex items-center gap-1">
        {#if !appStore.quickSearchMode && appStore.appMode === APP_MODE.INITIAL && appStore.query.length >= 3 && appStore.user?.id}
          <ViewActions actions={searchViewActions} size="sm" />
        {:else if appStore.appMode === APP_MODE.NOTES}
          <ViewActions actions={notesViewActions} size="sm" />
        {/if}
        <SidebarMenuButton />
      </div>
    {/snippet}
  </TopBar>
</form>
