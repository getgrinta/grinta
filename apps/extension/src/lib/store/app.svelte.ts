import { PersistedStore } from "$lib/utils.svelte";
import { z } from "zod";

export const THEME = {
  LIGHT: "LIGHT",
  DARK: "DARK",
} as const;

export type Theme = keyof typeof THEME;

export const AppDataSchema = z.object({
  currentSpaceId: z.number().optional(),
  theme: z.nativeEnum(THEME).default(THEME.LIGHT),
  includeCurrentPage: z.boolean().default(false),
});

export type AppData = z.infer<typeof AppDataSchema>;

export class AppStore extends PersistedStore<AppData> {
  data = $state(AppDataSchema.parse({}));

  setCurrentSpaceId(spaceId: number) {
    this.data.currentSpaceId = spaceId;
    this.persist();
  }
}

export const appStore = new AppStore({
  storageKey: "appData",
  schema: AppDataSchema,
});
