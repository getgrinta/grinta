<script lang="ts">
  import { appStore } from "$lib/store/app.svelte";
  import Sidebar from "./sidebar.svelte";
  import {
    ArrowRightIcon,
    CalendarIcon,
    ChevronRightIcon,
    ClipboardIcon,
    CogIcon,
    HelpCircleIcon,
    LogOutIcon,
    UserIcon,
    StickyNoteIcon,
  } from "lucide-svelte";
  import { shortcut } from "@svelte-put/shortcut";
  import { goto } from "$app/navigation";
  import { APP_MODE } from "@getgrinta/core";
  import { exit } from "@tauri-apps/plugin-process";
  import { _ } from "svelte-i18n";
  import Shortcut from "../shortcut.svelte";
  import { calendarStore } from "$lib/store/calendar.svelte"; // Import calendarStore instance
  import { CalendarAuthorizationStatus } from "$lib/types/calendar"; // Import Enum

  let { children } = $props<{
    children: () => void;
  }>();

  let helpLink = $state<HTMLAnchorElement>();
  const userId = $derived(appStore.user?.id);

  function closeMenu() {
    return appStore.setMenuOpen(false);
  }

  function handleMenuToggle() {
    const menuOpened = !appStore.menuOpen;

    return appStore.setMenuOpen(menuOpened);
  }

  async function handleClipboard() {
    closeMenu();
    await goto("/commands/CLIPBOARD");
    appStore.switchMode(APP_MODE.CLIPBOARD);
  }

  async function handleNotes() {
    closeMenu();
    await goto("/commands/NOTES");
    appStore.switchMode(APP_MODE.NOTES);
  }

  async function handleCalendar() {
    closeMenu();
    await goto("/commands/CALENDAR");
    appStore.switchMode(APP_MODE.CALENDAR);
  }

  function handleHelp() {
    closeMenu();
    setTimeout(() => {
      appStore.setQuery("");
    }, 100);
    return helpLink?.click();
  }

  function handleSettings() {
    closeMenu();
    setTimeout(() => {
      appStore.setQuery("");
    }, 100);
    return goto("/settings");
  }

  function handleProfile() {
    closeMenu();
    appStore.setQuery("");
    return goto("/profile");
  }

  function handleExit() {
    closeMenu();
    exit(0);
  }
</script>

<a
  bind:this={helpLink}
  href="https://getgrinta.com/guides"
  target="_blank"
  class="hidden">Help</a
>

<svelte:window
  use:shortcut={{
    trigger: [
      {
        key: "k",
        modifier: ["ctrl", "meta"],
        callback: handleMenuToggle,
      },
    ],
  }}
/>

{#if appStore.menuOpen}
  <Shortcut keys={["k"]} callback={handleCalendar} />
  <Shortcut keys={["c"]} callback={handleClipboard} />
  <Shortcut keys={["n"]} callback={handleNotes} />
  <Shortcut keys={["h"]} callback={handleHelp} />
  <Shortcut keys={["s"]} callback={handleSettings} />
  <Shortcut keys={["q"]} callback={handleExit} />
  <Shortcut keys={["p"]} callback={handleProfile} />
{/if}

<Sidebar id="menuSidebar" bind:sidebarOpened={appStore.menuOpen}>
  {@render children()}
  {#snippet sidebar()}
    <div class="flex justify-between items-center mb-4">
      <div
        class="tooltip tooltip-right tooltip-primary"
        data-tip={$_("common.back")}
      >
        <label for="menuSidebar" class="btn btn-sm btn-square">
          <ChevronRightIcon size={16} />
        </label>
      </div>
      {#if userId}
        <div
          class="tooltip tooltip-primary tooltip-left"
          data-tip={$_("menu.profile")}
        >
          <a href="/profile" onclick={closeMenu} class="gap-4">
            <div class="avatar">
              <div class="w-8 rounded-full">
                <img
                  src={`https://meshy.studio/api/mesh/${userId}?noise=8&sharpen=1&negate=false&gammaIn=2.1&gammaOut=2.2&brightness=100&saturation=100&hue=0&lightness=0&blur=0`}
                  alt="Avatar"
                />
              </div>
            </div>
          </a>
        </div>
      {/if}
    </div>
    <ul class="menu menu-lg w-full p-0">
      {#if calendarStore.authorizationStatus === CalendarAuthorizationStatus.Authorized}
        <li>
          <button onclick={handleCalendar} class="gap-4 items-center">
            <CalendarIcon size={20} />
            <span>{$_("menu.calendar")}</span>
            <kbd class="kbd">k</kbd>
          </button>
        </li>
      {/if}
      <li>
        <button onclick={handleNotes} class="gap-4 items-center">
          <StickyNoteIcon size={20} />
          <span>{$_("menu.notes")}</span>
          <kbd class="kbd">n</kbd>
        </button>
      </li>
      <li>
        <button onclick={handleClipboard} class="gap-4 items-center">
          <ClipboardIcon size={20} />
          <span>{$_("menu.clipboard")}</span>
          <kbd class="kbd">c</kbd>
        </button>
      </li>
      <li>
        <button onclick={handleHelp} class="gap-4 items-center">
          <HelpCircleIcon size={20} />
          <span>{$_("menu.help")}</span>
          <kbd class="kbd">h</kbd>
        </button>
      </li>
      <li>
        <a href="/settings" onclick={closeMenu} class="gap-4 items-center">
          <CogIcon size={20} />
          <span>{$_("menu.settings")}</span>
          <kbd class="kbd">s</kbd>
        </a>
      </li>
      <li>
        <button onclick={handleExit} class="gap-4 items-center">
          <LogOutIcon size={20} />
          <span>{$_("menu.exit")}</span>
          <kbd class="kbd">q</kbd>
        </button>
      </li>
    </ul>
    <div class="mt-auto">
      {#if !userId}
        <a
          href="/sign-in"
          onclick={closeMenu}
          class="btn w-full justify-between items-center"
        >
          <UserIcon size={16} />
          <div class="flex gap-2 items-center">
            <span>{$_("menu.signIn")}</span>
            <ArrowRightIcon size={16} />
          </div>
        </a>
      {:else if !appStore.hasPro}
        <a
          href="/profile?upgrade=true"
          onclick={closeMenu}
          class="btn btn-primary w-full justify-between items-center"
        >
          <img src="/pro.svg" width="32" height="32" alt="Get Pro" />
          <div class="flex gap-2 items-center">
            <span>{$_("menu.upgrade")}</span>
            <ArrowRightIcon size={16} />
          </div>
        </a>
      {/if}
    </div>
  {/snippet}
</Sidebar>
