import { stripeClient } from "@better-auth/stripe/client";
import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/svelte";
import { env } from "./env";

export const authClient = createAuthClient({
  baseURL: env.VITE_API_URL,
  plugins: [
    emailOTPClient(),
    stripeClient({
      subscription: true,
    }),
  ],
});
