<script lang="ts">
  import dayjs from "dayjs";
  import LocalizedFormat from "dayjs/plugin/localizedFormat";
  import "@fontsource-variable/dm-sans";
  import "../app.css";
  import { goto } from "$app/navigation";
  import { setVibrancy } from "$lib/grinta-invoke";
  import { locale, setupI18n, _ } from "$lib/i18n";
  import { appMetadataStore } from "$lib/store/app-metadata.svelte";
  import { appStore } from "$lib/store/app.svelte";
  import { clipboardStore } from "$lib/store/clipboard.svelte";
  import { commandsStore } from "$lib/store/commands.svelte";
  import { settingsStore } from "$lib/store/settings.svelte";
  import { vaultStore } from "$lib/store/vault.svelte";
  import { widgetsStore } from "$lib/store/widgets.svelte";
  import { systemThemeWatcher } from "$lib/system.utils.svelte";
  import { ColorModeValue } from "$lib/utils.svelte";
  import { Menu } from "@tauri-apps/api/menu";
  import { TrayIcon } from "@tauri-apps/api/tray";
  import { readText } from "@tauri-apps/plugin-clipboard-manager";
  import { exit } from "@tauri-apps/plugin-process";
  import { open } from "@tauri-apps/plugin-shell";
  import { clsx } from "clsx";
  import { onMount } from "svelte";
  import { toast, Toaster } from "svelte-sonner";
  import {
    currentMonitor,
    type PhysicalSize,
    type Monitor,
  } from "@tauri-apps/api/window";
  import PngIconUrl from "$lib/assets/tray.png?arraybuffer";
  import PngDevIconUrl from "$lib/assets/tray-dev.png?arraybuffer";
  import { onOpenUrl } from "@tauri-apps/plugin-deep-link";
  import type { UnlistenFn } from "@tauri-apps/api/event";
  import { APP_MODE, COMMAND_HANDLER } from "@getgrinta/core";
  import SidebarMenu from "$lib/components/sidebar-menu.svelte";
  import { shortcut } from "@svelte-put/shortcut";
  const { children } = $props();

  dayjs.extend(LocalizedFormat);

  let initializing = $state<boolean>(true);
  let monitor = $state<Monitor | null>(null);
  let lastMonitorScreenSize = $state<PhysicalSize | null>(null);

  if (process.env.NODE_ENV === "development") {
    window.onerror = (_event, _source, _lineno, _colno, err) => {
      const ErrorOverlay = customElements.get("vite-error-overlay");
      if (!ErrorOverlay) {
        return;
      }
      const overlay = new ErrorOverlay(err);
      document.body.appendChild(overlay);
    };
  }

  // Sync language with settings
  $effect(() => {
    if (settingsStore.data.language) {
      locale.set(settingsStore.data.language);
    }
  });

  async function initTrayIcon(
    didFinishOnboarding: boolean,
    isClipboardEnabled = true,
  ) {
    let menuItems = [
      {
        id: "help",
        text: $_("commands.menuItems.help"),
        action() {
          return open("https://getgrinta.com/guides");
        },
      },
      process.env.NODE_ENV === "development"
        ? {
            id: "development",
            text: "🧑‍💻 Development",
            action() {
              return commandsStore.handleCommand({
                handler: COMMAND_HANDLER.URL,
                value: "https://www.youtube.com/watch?v=AGsjA1pXajk",
                label: "Development",
                appModes: [APP_MODE.INITIAL],
                localizedLabel: "Development",
                metadata: {},
                smartMatch: false,
                priority: 0,
              });
            },
          }
        : {
            id: "update",
            text: $_("commands.menuItems.checkForUpdates"),
            action() {
              return appStore.updateApp();
            },
          },
      {
        item: "Separator",
      },
      {
        id: "exit",
        text: $_("commands.menuItems.exit"),
        action() {
          return exit();
        },
      },
    ];

    if (didFinishOnboarding) {
      menuItems = [
        {
          id: "search",
          text: $_("barMode.initial"),
          action() {
            appStore.appWindow?.show();
            appStore.appWindow?.setFocus();
            return goto("/");
          },
        },
        {
          id: "notes",
          text: $_("barMode.notes"),
          action() {
            appStore.appWindow?.show();
            appStore.appWindow?.setFocus();
            return goto(`/commands/${APP_MODE.NOTES}`);
          },
        },
        ...(isClipboardEnabled
          ? [
              {
                id: "clipboard",
                text: $_("commands.menuItems.clipboardHistory"),
                action() {
                  appStore.appWindow?.show();
                  appStore.appWindow?.setFocus();
                  return goto(`/commands/${APP_MODE.CLIPBOARD}`);
                },
              },
            ]
          : []),
        {
          item: "Separator",
        },
        {
          id: "settings",
          text: $_("commands.menuItems.settings"),
          action() {
            appStore.appWindow?.show();
            appStore.appWindow?.setFocus();
            return goto("/settings");
          },
        },
        {
          item: "Separator",
        },
        ...menuItems,
      ];
    }

    menuItems = [
      {
        id: "open",
        text: $_("commands.menuItems.open"),
        action() {
          appStore.appWindow?.show();
          appStore.appWindow?.setFocus();
          return Promise.resolve();
        },
      },
      ...menuItems,
    ];

    const TRAY_ID = "grinta";
    const menu = await Menu.new({
      items: menuItems as any,
    });

    TrayIcon.getById(TRAY_ID).then((trayIcon) => {
      if (trayIcon) {
        trayIcon.setMenu(menu);
      } else {
        TrayIcon.new({
          id: TRAY_ID,
          menu,
          icon:
            process.env.NODE_ENV === "development" ? PngDevIconUrl : PngIconUrl,
          iconAsTemplate: process.env.NODE_ENV !== "development",
        });
      }
    });
  }

  async function clipboardSnapshot() {
    try {
      const clipboardText = await readText();

      if (settingsStore.data?.clipboardRecordingEnabled) {
        await clipboardStore.addSnapshot(clipboardText);
      }
    } catch {
      console.log("Unreadable clipboard");
    }
  }

  function centerWindow() {
    currentMonitor().then((monitor) => {
      if (
        monitor?.size &&
        lastMonitorScreenSize &&
        (monitor.size.width !== lastMonitorScreenSize.width ||
          monitor.size.height !== lastMonitorScreenSize.height)
      ) {
        lastMonitorScreenSize = monitor.size;
        appStore.positionWindow();
      }
    });
  }

  async function initializeApp() {
    initializing = true;
    await setupI18n();
    await vaultStore.initialize();
    try {
      const authCookie = vaultStore.data?.authCookie ?? "";
      if (authCookie.length > 0) {
        await appStore.fetchSession();
      }
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        toast.warning(error.message);
      }
    }
    await commandsStore.initialize();
    await settingsStore.initialize();
    await clipboardStore.initialize();
    await widgetsStore.initialize();
    await appMetadataStore.initialize();
    monitor = await currentMonitor();
    lastMonitorScreenSize = monitor?.size ?? null;
    await appStore.positionWindow();
    await appStore.appWindow?.show();

    initializing = false;
    console.info("[Grinta] App initialized");
  }

  $effect(() => {
    const isOnboardingCompleted = settingsStore.data.onboardingCompleted;
    const isClipboardEnabled = settingsStore.data.clipboardRecordingEnabled;

    setTimeout(() => {
      initTrayIcon(isOnboardingCompleted, isClipboardEnabled);
    }, 500);
  });

  const accentLower = $derived(
    settingsStore?.data?.accentColor?.toLowerCase() ?? "mare",
  );

  const themeName = new ColorModeValue("grinta-light", "grinta-dark");
  const bgClass = new ColorModeValue("bg-base-100/60", "bg-base-100/80");
  const vibrancyValue = new ColorModeValue<"light" | "dark">("light", "dark");

  function preventCloseHandler(event: KeyboardEvent) {
    if (event.key === "q" && event.metaKey) {
      event.preventDefault();
    }
  }

  function deepLinkHandler(urls: string[]) {
    if (urls.length === 0) return;
    if (urls[0] === "grinta://start") {
      appStore.appWindow?.show();
      appStore.appWindow?.setFocus();
    }
  }

  $effect(() => {
    if (!vibrancyValue.value) return;
    setVibrancy(vibrancyValue.value);
  });

  onMount(() => {
    let deepLinkUnlisten: UnlistenFn;
    console.info("[Grinta] Layout Mount");
    initializeApp().catch((error) => {
      console.error("[Grinta] Initialization Error", error);
    });
    systemThemeWatcher.addEventListner();
    const clipboardIntervalId = setInterval(clipboardSnapshot, 5000);
    const centerWindowIntervalId = setInterval(centerWindow, 1000);
    document.addEventListener("keydown", preventCloseHandler);
    onOpenUrl(deepLinkHandler).then((unlisten) => {
      deepLinkUnlisten = unlisten;
    });

    return () => {
      settingsStore.unregisterShortcuts();
      systemThemeWatcher.removeEventListner();
      clearInterval(clipboardIntervalId);
      clearInterval(centerWindowIntervalId);
      deepLinkUnlisten?.();
      document.removeEventListener("keydown", preventCloseHandler);
    };
  });

  const toasterTheme = new ColorModeValue<"light" | "dark">("light", "dark");
</script>

<svelte:window
  use:shortcut={{
    trigger: [
      {
        key: "Escape",
        callback: () => appStore.handleEscape(),
      },
    ],
  }}
/>

<Toaster
  richColors
  position="bottom-center"
  theme={toasterTheme.value}
  closeButton
/>

<main
  id="mainLayout"
  class={clsx(
    "flex-1 flex flex-col accent-mare",
    bgClass.value,
    widgetsStore.showWidgets && "widgets-visible",
  )}
  data-theme={themeName.value}
  data-accent={accentLower}
>
  {#if initializing}
    <div class="skeleton w-full h-10 rounded-none"></div>
  {:else}
    <SidebarMenu>
      {@render children?.()}
    </SidebarMenu>
  {/if}
</main>
