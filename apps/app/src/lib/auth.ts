import { env } from "$env/dynamic/public";
import { stripeClient } from "@better-auth/stripe/client";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/svelte";
import { vaultStore } from "./store/vault.svelte";

export function getAuthClient() {
	const authCookie = vaultStore.vault?.authCookie ?? "";
	console.log(">>>Auth cookie", authCookie, vaultStore);
	return createAuthClient({
		baseURL: env.PUBLIC_BETTER_AUTH_URL,
		fetchOptions: {
			customFetchImpl: tauriFetch,
			headers: {
				Cookie: vaultStore.vault?.authCookie ?? "",
			},
		},
		plugins: [
			emailOTPClient(),
			stripeClient({
				subscription: true,
			}),
		],
	});
}
