import { stripeClient } from "@better-auth/stripe/client";
import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/svelte";
import type { AppType } from "@getgrinta/api";
import { hc } from "hono/client";
import { env } from "./env";

// @ts-expect-error
export const apiClient = hc<AppType>(env.PUBLIC_API_URL);

export const authClient = createAuthClient({
    baseURL: env.PUBLIC_API_URL,
    plugins: [
        emailOTPClient(),
        stripeClient({
            subscription: true,
        }),
    ],
});
