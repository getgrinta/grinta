<script lang="ts">
  import { goto } from "$app/navigation";
  import { requestAccessToUserFolders } from "$lib/grinta-invoke";
  import clsx from "clsx";
  import humanizeString from "humanize-string";
  import { onMount } from "svelte";
  import { _ } from "svelte-i18n";
  import { enable } from "@tauri-apps/plugin-autostart";
  import { appStore } from "$lib/store/app.svelte";
  import {
    ACCENT_COLOR,
    LANGUAGE_NATIVE_NAME,
    SEARCH_ENGINE,
    SEARCH_ENGINE_STYLED,
  } from "@getgrinta/core";
  import { settingsStore } from "$lib/store/settings.svelte";

  let finishingOnboarding = $state(false);
  let audio = $state<HTMLAudioElement>();

  const ONBOARDING_SHORTCUTS = {
    "CommandOrControl+Space": "⌘+Space",
    "CommandOrControl+Shift+G": "⌘+Shift+G",
  };

  async function finishOnboarding() {
    finishingOnboarding = true;
    await requestAccessToUserFolders();
    await enable();
    settingsStore.finishOnboarding();
    finishingOnboarding = false;
    appStore.appWindow?.show();
    return goto("/commands/INITIAL");
  }

  onMount(() => {
    if (!audio) return;
    audio.volume = 0.4;
    setTimeout(() => audio?.play(), 1000);
  });
</script>

<audio bind:this={audio} volume="0.5" autoplay playsinline>
  <source src="/onboarding.mp3" type="audio/mpeg" />
</audio>

<div class="flex flex-1 px-8 py-4 gap-8">
  <div class="flex flex-col flex-1 gap-4 justify-center">
    <img src="/logo.svg" alt="Grinta Logo" class="w-12 h-12" />
    <h1 class="text-2xl font-semibold">{$_("welcome.title")}</h1>
    <p class="max-w-[15rem] leading-8">{$_("welcome.subtitle")}</p>
  </div>
  <div class="flex flex-col flex-1 gap-4 justify-center">
    <div class="flex flex-col gap-2">
      <label for="language" class="label text-sm"
        >{$_("settings.language")}</label
      >
      <select
        id="language"
        bind:value={settingsStore.data.language}
        class="select w-full"
      >
        {#each Object.entries(LANGUAGE_NATIVE_NAME) as [code, name]}
          <option value={code}>{name}</option>
        {/each}
      </select>
      <label for="accentColor" class="label text-sm"
        >{$_("settings.fields.accentColor")}</label
      >
      <div class="flex gap-2">
        {#each Object.values(ACCENT_COLOR) as color}
          <input
            id={color}
            type="radio"
            name="accentColor"
            value={color}
            bind:group={settingsStore.data.accentColor}
            class="radio radio-primary"
          />
          <label for={color} class="label text-sm"
            >{humanizeString(color)}</label
          >
        {/each}
      </div>
      <label for="searchEngine" class="label text-sm"
        >{$_("settings.fields.defaultSearchEngine")}</label
      >
      <select
        id="searchEngine"
        bind:value={settingsStore.data.defaultSearchEngine}
        class="select w-full"
      >
        {#each Object.values(SEARCH_ENGINE) as engine}
          <option value={engine}>{SEARCH_ENGINE_STYLED[engine]}</option>
        {/each}
      </select>
      <label for="toggleShortcut" class="label text-sm"
        >{$_("settings.fields.shortcut")}</label
      >
      <div class="join">
        {#each Object.entries(ONBOARDING_SHORTCUTS) as [key, value]}
          <input
            id={key}
            type="radio"
            class={clsx(
              "radio",
              settingsStore.data.toggleShortcut === key && "radio-primary",
            )}
            onclick={() => settingsStore.setToggleShortcut(key)}
            value={key}
            aria-label={value}
            checked={settingsStore.data.toggleShortcut === key}
          />
          <label for={key} class="label text-sm mx-2">{value}</label>
        {/each}
      </div>
    </div>
    <button
      class="btn"
      onclick={finishOnboarding}
      disabled={finishingOnboarding}>{$_("common.next")}</button
    >
  </div>
</div>
