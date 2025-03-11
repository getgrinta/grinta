<script lang="ts">
import { goto } from "$app/navigation";
import { getAuthClient } from "$lib/auth";
import TopBar from "$lib/components/top-bar.svelte";
import { appStore } from "$lib/store/app.svelte";
import { openUrl } from "@tauri-apps/plugin-opener";

const authClient = getAuthClient();

function goBack() {
	return goto("/commands/MENU");
}

async function upgradeToPro() {
	const { data } = await authClient.subscription.upgrade({
		plan: "pro",
		successUrl: "/profile",
		cancelUrl: "/profile",
		uiMode: "hosted",
		disableRedirect: true,
	});
	if (!data?.url) return;
	await openUrl(data.url);
}
</script>

<div class="flex flex-1 flex-col">
    <TopBar {goBack}>
        <h1 slot="input" class="text-lg font-semibold w-full">Profile</h1>
        <button slot="addon" class="btn">Sign out</button>
    </TopBar>
    <div class="flex flex-1 flex-col mt-24 px-8 gap-4">
        <h2 class="text-xl font-semibold">Account</h2>
        <div class="grid grid-cols-2 gap-4">
            <label for="emailField" class="label">Email Address</label>
            <input id="emailField" type="email" class="input w-full" value={appStore.user?.email} disabled />
        </div>
        <h2 class="text-xl font-semibold">Subscription</h2>
        <div class="grid grid-cols-2 gap-4">
            <label for="emailField" class="label">Grinta Pro</label>
            <button class="btn" onclick={upgradeToPro}>Upgrade to Pro</button>
        </div>
    </div>
</div>
