<script lang="ts">
  import { goto } from "$app/navigation";
  import { settingsStore } from "$lib/store/settings.svelte";
  import { APP_MODE } from "@getgrinta/core";
  import { onMount } from "svelte";

  onMount(() => {
    if (!settingsStore.data.onboardingCompleted) {
      return goto("/onboarding");
    }
    return goto(`/commands/${APP_MODE.INITIAL}`);
  });
</script>
