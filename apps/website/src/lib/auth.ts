import { stripeClient } from "@better-auth/stripe/client";
import { emailOTPClient, oneTimeTokenClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/svelte";
import type { AppType } from "@getgrinta/api";
import { hc } from "hono/client";

const PUBLIC_API_URL =
  import.meta.env.PUBLIC_API_URL ?? "https://api.getgrinta.com";

// @ts-expect-error
export const apiClient = hc<AppType>(PUBLIC_API_URL, {
  fetch: ((input: RequestInfo, init: RequestInit) => {
    return fetch(input, {
      ...init,
      credentials: "include", // Required for sending cookies cross-origin
    });
  }) as typeof fetch,
});

export const authClient = createAuthClient({
  baseURL: PUBLIC_API_URL,
  fetchOptions: {
    credentials: "include",
  },
  plugins: [
    emailOTPClient(),
    stripeClient({
      subscription: true,
    }),
    oneTimeTokenClient(),
  ],
});
