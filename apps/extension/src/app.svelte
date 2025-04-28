<script lang="ts">
  import { Router, Route } from "@ryuz/rsv";
  import { Toaster } from "svelte-sonner";
  import Home from "$pages/home.svelte";
  import Agent from "$pages/agent.svelte";
  import SignIn from "$pages/sign-in.svelte";
  import Profile from "$pages/profile.svelte";
  import Settings from "$pages/settings.svelte";
  import { appStore } from "$lib/store/app.svelte";
  import { onMount } from "svelte";

  onMount(() => {
    appStore.restore();
    chrome.tabGroups.query({}).then((groups) => {
      if (groups.length === 0) {
      }
      appStore.setCurrentSpaceId(groups[0]?.id);
    });
  });
</script>

<Toaster position="top-center" />

<div
  class="flex-1 flex flex-col"
  data-theme={appStore.data.theme.toLowerCase()}
>
  <Router mode="hash">
    <Route path="/" component={Home} />
    <Route path="/agent" component={Agent} />
    <Route path="/sign-in" component={SignIn} />
    <Route path="/profile" component={Profile} />
    <Route path="/settings" component={Settings} />
  </Router>
</div>
