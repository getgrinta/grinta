import { env } from "$env/dynamic/public";
import { stripeClient } from "@better-auth/stripe/client";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/svelte";
import { vaultStore } from "./store/vault.svelte";

export function getAuthClient() {
	return createAuthClient({
		baseURL: env.PUBLIC_API_URL,
		basePath: "/api/auth",
		fetchOptions: {
			customFetchImpl: tauriFetch,
			headers: {
				Cookie: vaultStore.data?.authCookie ?? "",
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
