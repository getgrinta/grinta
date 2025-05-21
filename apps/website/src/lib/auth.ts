import { stripeClient } from "@better-auth/stripe/client";
import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/svelte";
import type { AppType } from "@getgrinta/api";
import { hc } from "hono/client";

const PUBLIC_API_URL =
  import.meta.env.PUBLIC_API_URL ?? "https://api.getgrinta.com";

// @ts-expect-error
export const apiClient = hc<AppType>(PUBLIC_API_URL);

export const authClient = createAuthClient({
  baseURL: PUBLIC_API_URL,
  plugins: [
    emailOTPClient(),
    stripeClient({
      subscription: true,
    }),
  ],
});
