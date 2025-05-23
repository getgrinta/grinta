<script lang="ts">
  import { onMount } from "svelte";
  import { InfoIcon } from "lucide-svelte";
  import { authClient } from "../lib/auth";
  import { navigate } from "astro:transitions/client";
  import { toast } from "svelte-sonner";

  let { user, profile } = $props<{
    user: import("better-auth").User;
    profile: object;
  }>();

  let subscription = $derived(profile?.subscriptions?.[0]);

  async function signOut() {
    await authClient.signOut();
    return navigate("/");
  }

  async function upgradeToPro() {
    const { error } = await authClient.subscription.upgrade({
      plan: "pro",
      successUrl: "https://getgrinta.com/success",
      cancelUrl: "https://getgrinta.com/account",
    });
    if (error) {
      return toast.error(error.message ?? "Subscription Error");
    }
  }

  async function manageSubscription() {
    const { error } = await authClient.subscription.cancel({
      returnUrl: "https://getgrinta.com/account",
    });
    if (error) {
      return toast.error(error.message ?? "Subscription Error");
    }
  }

  onMount(() => {
    if (typeof window === "undefined") return;
    const searchParams = new URLSearchParams(window.location.search);
    const fetchSession = searchParams.get("fetchSession");
    if (fetchSession) {
      setTimeout(() => {
        window.grinta.fetchSession();
      }, 1000);
    }
  });
</script>

<div class="flex flex-col mt-24 items-center px-4 xl:px-0">
  <div class="card lg:max-w-180 w-full bg-base-100 card-lg shadow-sm">
    <div class="card-body">
      <div class="flex gap-2 items-center justify-between">
        <h2 class="card-title">Profile</h2>
        <div class="avatar w-12 rounded-full">
          <img
            src={`https://meshy.studio/api/mesh/${user.id}?noise=8&sharpen=1&negate=false&gammaIn=2.1&gammaOut=2.2&brightness=100&saturation=100&hue=0&lightness=0&blur=0`}
            alt="Avatar"
            class="rounded-full"
          />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4 items-center">
        <p class="font-semibold">Name</p>
        <p class="justify-self-end">{user.name || "-"}</p>
        <p class="font-semibold">Email</p>
        <p class="justify-self-end">{user.email}</p>
      </div>
    </div>
  </div>
  <div class="card lg:max-w-180 w-full bg-base-100 card-lg shadow-sm mt-8">
    <div class="card-body">
      <div class="flex justify-between items-center">
        <h2 class="card-title">AI Usage</h2>
        <div
          class="tooltip tooltip-left"
          data-tip="AI Usage includes GrintAI, editor autocompletion, and speech to text."
        >
          <button class="btn btn-ghost btn-square btn-sm"
            ><InfoIcon size={24} /></button
          >
        </div>
      </div>
      <div class="flex justify-between items-center">
        <p class="font-semibold">Daily Usage</p>
        <p class="text-right">
          {profile?.dailyAiUsage}/{profile?.maxDailyAiUsage}
        </p>
      </div>
      <progress
        class="progress progress-primary w-full"
        value={profile?.dailyAiUsage}
        max={profile?.maxDailyAiUsage}
      ></progress>
    </div>
  </div>
  <div class="card lg:max-w-180 w-full bg-base-100 card-lg shadow-sm mt-8">
    <div class="card-body">
      <div class="flex justify-between items-center">
        <h2 class="card-title">Subscription</h2>
        <a href="/pro/notes" class="link">Learn More</a>
      </div>
      <div class="grid grid-cols-2 gap-4 items-center">
        <img src="/grinta_pro.svg" alt="Grinta Pro" class="w-40 h-6" />
        {#if subscription}
          <button class="btn btn-primary w-full" onclick={manageSubscription}
            >Manage Subscription</button
          >
        {:else}
          <button class="btn btn-primary w-full" onclick={upgradeToPro}
            >Upgrade To Pro</button
          >
        {/if}
      </div>
    </div>
  </div>
  <div class="card lg:max-w-180 w-full bg-base-100 card-lg shadow-sm mt-8">
    <div class="card-body">
      <h2 class="card-title">Actions</h2>
      <div class="grid grid-cols-2 gap-4 items-center">
        <p>Session</p>
        <button class="btn w-full" onclick={signOut}>Sign Out</button>
        <p>One Time Token</p>
        <a href="/code" class="btn w-full">Generate Token</a>
      </div>
    </div>
  </div>
</div>
