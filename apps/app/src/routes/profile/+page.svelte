<script lang="ts">
	import { goto } from "$app/navigation";
	import { getAuthClient } from "$lib/auth";
	import PrimaryButton from "$lib/components/primary-button.svelte";
	import TopBar from "$lib/components/top-bar.svelte";
	import { appStore } from "$lib/store/app.svelte";
	import { fail } from "$lib/utils.svelte";
	import { openUrl } from "@tauri-apps/plugin-opener";
	import { onMount } from "svelte";
	import { _ } from "$lib/i18n";

	type ViewState = "idle" | "subscribing";

	let viewState = $state<ViewState>("idle");
	let subscribingModalRef = $state<HTMLDialogElement>();
	let subscriptionCheckInterval = $state<number | Timer>();
	const authClient = getAuthClient();

	function setViewState(newViewState: ViewState) {
		viewState = newViewState;
	}

	function startSubscriptionCheck() {
		setViewState("subscribing");
		subscribingModalRef?.showModal();
		subscriptionCheckInterval = setInterval(async () => {
			await appStore.fetchSession();
		}, 5000);
	}

	function stopSubscriptionCheck() {
		clearInterval(subscriptionCheckInterval);
		setViewState("idle");
		subscribingModalRef?.close();
	}

	async function initialize() {
		await appStore.fetchSession();
	}

	function goBack() {
		return goto("/commands/MENU");
	}

	async function upgradeToPro() {
		const { data, error } = await authClient.subscription.upgrade({
			plan: "pro",
			successUrl: "/profile",
			cancelUrl: "/profile",
			uiMode: "hosted",
			disableRedirect: true,
		});
		if (error) {
			throw fail("Subscription Error", error);
		}	
		if (!data?.url) return;
		startSubscriptionCheck();
		await openUrl(data.url);
	}

	async function cancelSubscription() {
		const { data, error } = await authClient.subscription.cancel({
			returnUrl: "/account",
			uiMode: "hosted",
			disableRedirect: true,
		});
		if (error) {
			throw fail("Subscription Error", error);
		}
		if (!data?.url) return;
		await openUrl(data.url);
	}

	onMount(initialize);

	$effect(() => {
		if ((appStore.subscriptions?.length ?? 0) > 0) {
			stopSubscriptionCheck();
		}
	});
</script>

<dialog id="subscribingModal" class="modal" bind:this={subscribingModalRef}>
	<div class="modal-box">
		<h3 class="text-lg font-bold">{$_("profile.subscriptionModal.title")}</h3>
		<p class="py-4">{$_("profile.subscriptionModal.description")}</p>
		<div class="modal-action">
			<form method="dialog">
				<button
					type="button"
					onclick={stopSubscriptionCheck}
					class="btn">{$_("profile.subscriptionModal.cancel")}</button
				>
			</form>
		</div>
	</div>
</dialog>

<div class="flex flex-1 flex-col">
	<TopBar {goBack}>
		<h1 slot="input" class="text-lg font-semibold w-full">{$_("profile.title")}</h1>
		<PrimaryButton slot="addon" class="btn">{$_("profile.signOut")}</PrimaryButton>
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
			{#if appStore.subscriptions?.length ?? 0 > 0}
				<PrimaryButton type="button" class="btn" onclick={cancelSubscription}
					>{$_("profile.cancel")}</PrimaryButton
				>
			{:else}
				<PrimaryButton type="button" class="btn" onclick={upgradeToPro}
					>{$_("profile.upgradeButton")}</PrimaryButton
				>
			{/if}
		</div>
	</div>
</div>
