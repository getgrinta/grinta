import { PersistedStore } from "$lib/utils.svelte";
import { z } from "zod/v3";
import { Mnemonic } from 'ox'

export function generateMnemonic() {
  return Mnemonic.random(Mnemonic.english)
}

export const THEME = {
  LIGHT: "LIGHT",
  DARK: "DARK",
  SYSTEM: "SYSTEM",
} as const;

export type Theme = keyof typeof THEME;

export const AppDataSchema = z.object({
  theme: z.nativeEnum(THEME).default(THEME.SYSTEM),
  syncEncryptionKey: z.string().default(generateMnemonic),
});

export type AppData = z.infer<typeof AppDataSchema>;

export class AppStore extends PersistedStore<AppData> {
  data = $state(AppDataSchema.parse({}));

  async regenerateMnemonic() {
    this.data.syncEncryptionKey = generateMnemonic();
    await this.persist();
  }
}

export const appStore = new AppStore({
  storageKey: "appData",
  schema: AppDataSchema,
});
