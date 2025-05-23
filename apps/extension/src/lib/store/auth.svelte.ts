import { authClient } from "$lib/auth";
import type { Session } from "better-auth";
import type { User } from "better-auth";

export class AuthStore {
  session = $state<Session>();
  user = $state<User>();

  async fetchSession() {
    const { data } = await authClient.getSession();
    if (!data) return;
    this.session = data.session;
    this.user = data.user;
  }
}

export const authStore = new AuthStore();
