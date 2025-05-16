<script lang="ts">
  import { apiClient, authClient } from "$lib/auth";
  import Layout from "$lib/components/layout.svelte";
  import ViewTitle from "$lib/components/view-title.svelte";
  import { tabsStore } from "$lib/store/tabs.svelte";
  import { useRsv } from "@ryuz/rsv";
  import { SettingsIcon, PlusIcon } from "lucide-svelte";
  import { onMount } from "svelte";
  import { toast } from "svelte-sonner";
  import { sendMessage } from "webext-bridge/popup";

  const router = useRsv();
  const currentGroupId = $derived(
    tabsStore.tabs.find((tab) => tab.active)?.groupId,
  );
  let subscriptions = $state([]);
  let subscribingModalRef = $state<HTMLDialogElement>();
  let subscriptionCheckInterval = $state<number | NodeJS.Timeout>();

  const session = authClient.useSession();
  const user = $derived($session.data?.user);

  function startSubscriptionCheck() {
    subscribingModalRef?.showModal();
    subscriptionCheckInterval = setInterval(async () => {
      await fetchSubscriptions();
    }, 5000);
  }

  async function fetchSubscriptions() {
    const profileRequest = await apiClient.api.users.me.$get();
    const profile = await profileRequest.json();
    subscriptions = profile.subscriptions ?? [];
  }

  function stopSubscriptionCheck() {
    clearInterval(subscriptionCheckInterval as number);
    subscribingModalRef?.close();
  }

  async function upgradeToPro() {
    const { data, error } = await authClient.subscription.upgrade({
      plan: "pro",
      successUrl: "https://getgrinta.com/success",
      cancelUrl: "https://getgrinta.com/",
      disableRedirect: true,
    });
    if (error) {
      return toast.error("Subscription Error");
    }
    if (!data?.url) return;
    startSubscriptionCheck();
    await sendMessage(
      "grinta_newTab",
      { url: data.url, groupId: currentGroupId },
      "background",
    );
  }

  async function cancelSubscription() {
    const { data, error } = await authClient.subscription.cancel({
      returnUrl: "https://getgrinta.com/cancelled",
    });
    if (error) {
      return toast.error("Subscription Cancel Error");
    }
    if (!data?.url) return;
    await sendMessage(
      "grinta_newTab",
      { url: data.url, groupId: currentGroupId },
      "background",
    );
  }

  async function signOut() {
    await authClient.signOut();
    toast.success("Signed out");
    router?.navigate("/");
  }

  onMount(() => {
    fetchSubscriptions();
  });

  $effect(() => {
    if (subscriptions.length > 0) {
      stopSubscriptionCheck();
    }
  });
</script>

<dialog id="subscribingModal" class="modal" bind:this={subscribingModalRef}>
  <div class="modal-box">
    <h3 class="text-lg font-bold">Continue in Tab</h3>
    <p class="py-4">
      Continue the subscription process in the subscription page.
    </p>
    <div class="modal-action">
      <form method="dialog">
        <button type="button" onclick={stopSubscriptionCheck} class="btn"
          >Cancel</button
        >
      </form>
    </div>
  </div>
</dialog>

<Layout>
  <ViewTitle title="Profile">
    {#snippet addon()}
      <button
        class="btn btn-ghost btn-sm btn-square"
        onclick={() => router?.navigate("/settings")}
      >
        <SettingsIcon size={20} />
      </button>
    {/snippet}
  </ViewTitle>
  <div class="flex-1 flex flex-col p-2">
    <div class="w-full flex flex-col gap-2">
      <h2 class="text-lg font-semibold">Account</h2>
      <label for="email" class="label">Email</label>
      <input
        id="email"
        name="email"
        type="email"
        class="input w-full"
        value={user?.email ?? ""}
        disabled
      />
      <button class="btn" onclick={signOut}>Sign Out</button>
      <div class="flex justify-between items-center mt-4">
        <h2 class="text-lg font-semibold">Smart Actions</h2>
        <button class="btn btn-square btn-sm" disabled>
          <PlusIcon />
        </button>
      </div>
      <p>Add site specific actions</p>
      <button class="btn" disabled>Summarize</button>
      <h2 class="text-lg font-semibold mt-4">Grinta Pro</h2>
      <p>Get higher rate limit and more features.</p>
      {#if subscriptions.length > 0}
        <button id="pro" class="btn" onclick={cancelSubscription}>
          Cancel Subscription
        </button>
      {:else}
        <button id="pro" class="btn btn-primary" onclick={upgradeToPro}>
          Get Grinta Pro
        </button>
      {/if}
    </div>
  </div>
</Layout>
