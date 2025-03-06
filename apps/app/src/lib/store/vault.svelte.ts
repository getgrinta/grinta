import { z } from "zod";
import { SecureStore } from "./secure.svelte";

export const VaultSchema = z.object({
	authCookie: z.string().default(""),
});

export type Vault = z.infer<typeof VaultSchema>;

export class VaultStore extends SecureStore<Vault> {
	async initialize() {
		await this.restore();
	}

	async setAuthCookie(authCookie: string) {
		this.updateData({ authCookie });
	}
}

export const vaultStore = new VaultStore({
	schema: VaultSchema,
	fileName: "vault.json",
	storageKey: "vault",
});
