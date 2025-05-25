import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { oneTimeTokenClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/svelte";
import { getHeaders } from "./utils.svelte";
import { vaultStore } from "./store/vault.svelte";
import { env } from "./env";

async function wrappedFetch(
  input: string | URL | globalThis.Request,
  init?: RequestInit,
) {
  const response = await tauriFetch(input, {
    body: init?.body,
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
      ...getHeaders(),
    },
  });
  const authCookie = response.headers.getSetCookie()?.[0];
  if (authCookie) {
    await vaultStore.setAuthCookie(authCookie);
  }
  return response;
}

export function getAuthClient() {
  return createAuthClient({
    baseURL: env.PUBLIC_API_URL,
    fetchOptions: {
      customFetchImpl: wrappedFetch,
    },
    plugins: [oneTimeTokenClient()],
  });
}
