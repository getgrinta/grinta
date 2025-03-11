import { env } from "$env/dynamic/public";
import { stripeClient } from "@better-auth/stripe/client";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/svelte";
import { getHeaders } from "./utils.svelte";

export function getAuthClient() {
	return createAuthClient({
		baseURL: env.PUBLIC_API_URL,
		fetchOptions: {
			customFetchImpl: tauriFetch,
			headers: getHeaders(),
		},
		plugins: [
			emailOTPClient(),
			stripeClient({
				subscription: true,
			}),
		],
	});
}
