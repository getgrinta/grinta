import { PersistedStore } from "$lib/utils.svelte";
import { z } from "zod";

export const THEME = {
  LIGHT: "LIGHT",
  DARK: "DARK",
  SYSTEM: "SYSTEM",
} as const;

export type Theme = keyof typeof THEME;

export const AppDataSchema = z.object({
  theme: z.nativeEnum(THEME).default(THEME.SYSTEM),
});

export type AppData = z.infer<typeof AppDataSchema>;

export class AppStore extends PersistedStore<AppData> {
  data = $state(AppDataSchema.parse({}));
}

export const appStore = new AppStore({
  storageKey: "appData",
  schema: AppDataSchema,
});
