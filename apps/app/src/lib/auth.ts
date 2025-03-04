import { env } from "$env/dynamic/public";
import { stripeClient } from "@better-auth/stripe/client";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/svelte";

export const authClient = createAuthClient({
	baseURL: env.PUBLIC_BETTER_AUTH_URL,
	fetchOptions: {
		customFetchImpl: tauriFetch,
	},
	plugins: [
		emailOTPClient(),
		stripeClient({
			subscription: true,
		}),
	],
});
