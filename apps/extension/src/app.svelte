<script lang="ts">
  import "@fontsource/geist/400.css";
  import "@fontsource/geist/600.css";
  import "@fontsource/geist/800.css";
  import dayjs from "dayjs";
  import relativeTime from "dayjs/plugin/relativeTime";
  import localizedFormat from "dayjs/plugin/localizedFormat";
  import { Router, Route } from "@ryuz/rsv";
  import { Toaster } from "svelte-sonner";
  import Home from "$pages/home.svelte";
  import Chats from "$pages/chats.svelte";
  import ChatsHistory from "$pages/chats-history.svelte";
  import SignIn from "$pages/sign-in.svelte";
  import Profile from "$pages/profile.svelte";
  import Settings from "$pages/settings.svelte";
  import { appStore } from "$lib/store/app.svelte";
  import { tabsStore } from "$lib/store/tabs.svelte";
  import { onMount } from "svelte";
  import { sessionStorage } from "$lib/storage";
  import { sendMessage } from "webext-bridge/popup";
  import { ModeWatcher, systemPrefersMode } from "mode-watcher";
  import { chatsStore } from "$lib/store/chats.svelte";

  dayjs.extend(relativeTime);
  dayjs.extend(localizedFormat);

  const appTheme = $derived(
    appStore.data.theme === "SYSTEM"
      ? systemPrefersMode.current
      : appStore.data.theme.toLowerCase(),
  );

  function requestStateUpdate() {
    return sendMessage("grinta_updateState", {}, "background");
  }

  onMount(() => {
    appStore.restore().then(async () => {
      await requestStateUpdate();
      await chatsStore.restore();
    });
    sessionStorage.watch({
      state: ({ newValue }) => {
        return tabsStore.syncState(JSON.parse(newValue));
      },
    });
    return () => {
      sessionStorage.unwatchAll();
    };
  });
</script>

<Toaster position="top-center" />

<ModeWatcher />

<div class="flex-1 flex flex-col" data-theme={appTheme}>
  <Router mode="hash">
    <Route path="/" component={Home} />
    <Route path="/history" component={ChatsHistory} />
    <Route path="/chats" component={Chats} />
    <Route path="/chats/:id" component={Chats} />
    <Route path="/sign-in" component={SignIn} />
    <Route path="/profile" component={Profile} />
    <Route path="/settings" component={Settings} />
  </Router>
</div>
