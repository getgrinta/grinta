<script lang="ts">
  import { Router, Route } from "@ryuz/rsv";
  import { Toaster } from "svelte-sonner";
  import Home from "$pages/home.svelte";
  import Chats from "$pages/chats.svelte";
  import SignIn from "$pages/sign-in.svelte";
  import Profile from "$pages/profile.svelte";
  import Settings from "$pages/settings.svelte";
  import { appStore } from "$lib/store/app.svelte";
  import { tabsStore } from "$lib/store/tabs.svelte";
  import { onMount } from "svelte";
  import { sessionStorage } from "$lib/storage";
  import { sendMessage } from "webext-bridge/popup";

  function requestStateUpdate() {
    return sendMessage("grinta_updateState", {}, "background");
  }

  onMount(() => {
    appStore.restore().then(async () => {
      await requestStateUpdate();
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
<div
  class="flex-1 flex flex-col"
  data-theme={appStore.data.theme.toLowerCase()}
>
  <Router mode="hash">
    <Route path="/" component={Home} />
    <Route path="/chats" component={Chats} />
    <Route path="/chats/:id" component={Chats} />
    <Route path="/sign-in" component={SignIn} />
    <Route path="/profile" component={Profile} />
    <Route path="/settings" component={Settings} />
  </Router>
</div>
