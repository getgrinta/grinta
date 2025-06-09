<script lang="ts">
  import { goto } from "$app/navigation";
  import { getAuthClient } from "$lib/auth";
  import TopBar from "$lib/components/top-bar.svelte";
  import { appStore } from "$lib/store/app.svelte";
  import { fail } from "$lib/utils.svelte";
  import { openUrl } from "@tauri-apps/plugin-opener";
  import { onMount } from "svelte";
  import { _ } from "$lib/i18n";
  import { vaultStore } from "$lib/store/vault.svelte";
  import { toast } from "svelte-sonner";

  const authClient = getAuthClient();

  function goBack() {
    return goto("/commands/INITIAL");
  }

  async function manageAccount() {
    await openUrl("https://getgrinta.com/account");
  }

  async function signOut() {
    const { error } = await authClient.signOut();
    if (error) {
      throw fail("Sign out error", error);
    }
    appStore.clearSessionData();
    vaultStore.setAuthCookie("");
    return goto("/commands/INITIAL");
  }

  onMount(() => {
    appStore.fetchSession().catch((error) => {
      toast.error(error.message ?? "Could not fetch the data.");
    });
  });
</script>

<div class="flex flex-1 flex-col">
  <TopBar {goBack}>
    {#snippet input()}
      <h1 class="text-lg font-semibold w-full">
        {$_("profile.title")}
      </h1>
    {/snippet}
    {#snippet addon()}
      <button type="button" class="btn btn-sm" onclick={signOut}
        >{$_("profile.signOut")}</button
      >
    {/snippet}
  </TopBar>
  <div class="flex flex-1 flex-col mt-24 px-8 gap-4">
    <h2 class="text-xl font-semibold">{$_("profile.account")}</h2>
    <div class="grid grid-cols-2 gap-4">
      <label for="emailField" class="label">{$_("profile.emailAddress")}</label>
      <input
        id="emailField"
        type="email"
        class="input w-full"
        value={appStore.user?.email}
        disabled
      />
    </div>
    <h2 class="text-xl font-semibold">{$_("profile.subscription")}</h2>
    <div class="grid grid-cols-2 gap-4">
      <label for="emailField" class="label">{$_("profile.grintaPro")}</label>
      <button type="button" class="btn" onclick={manageAccount}
        >{$_("profile.manageAccount")}</button
      >
    </div>
  </div>
</div>
