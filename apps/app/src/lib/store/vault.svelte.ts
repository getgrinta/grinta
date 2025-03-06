import { env } from "$env/dynamic/public";
import { appDataDir } from "@tauri-apps/api/path";
import { load } from "@tauri-apps/plugin-store";
import { AesGcm, Hex } from "ox";
import superjson from "superjson";
import { z } from "zod";

export const VaultSchema = z.object({
	authCookie: z.string().default(""),
});

export type Vault = z.infer<typeof VaultSchema>;

export class VaultStore {
	vault = $state<Vault>(VaultSchema.parse({}));

	async getEncryptionKey() {
		console.log(">>>EC", env.PUBLIC_ENCRYPTION_KEY);
		if (!env.PUBLIC_ENCRYPTION_KEY)
			throw new Error("PUBLIC_ENCRYPTION_KEY is not set");
		return AesGcm.getKey({ password: env.PUBLIC_ENCRYPTION_KEY });
	}

	async initialize() {
		await this.restore();
	}

	async setVault(vault: Vault) {
		this.vault = VaultSchema.parse(vault);
		await this.persist();
	}

	async setAuthCookie(authCookie: string) {
		await this.setVault({ ...this.vault, authCookie });
	}

	async restore() {
		try {
			console.log(appDataDir());
			const encryptionKey = await this.getEncryptionKey();
			const store = await load("vault.json");
			const vaultString = await store.get<Hex.Hex>("vault");
			if (!vaultString) {
				throw new Error("Vault not found");
			}
			console.log(">>>Vault String", vaultString);
			const decryptedHex = await AesGcm.decrypt(vaultString, encryptionKey);
			console.log(">>>Decrypted Hex", decryptedHex, decryptedHex.length);
			const decrypted = Hex.toString(decryptedHex);
			return this.setVault(superjson.parse(decrypted));
		} catch (error) {
			console.error("Error restoring vault:", error);
			return this.setVault(VaultSchema.parse({}));
		}
	}

	async persist() {
		try {
			const encryptionKey = await this.getEncryptionKey();
			const store = await load("vault.json");
			const vaultString = superjson.stringify(this.vault);
			const vaultHex = Hex.fromString(vaultString);
			const encryptedHex = await AesGcm.encrypt(vaultHex, encryptionKey);
			console.log(">>>Encrypted Hex", encryptedHex, encryptedHex.length);
			await store.set("vault", encryptedHex);
			await store.save();
		} catch (error) {
			console.error("Error persisting vault:", error);
		}
	}
}

export const vaultStore = new VaultStore();
