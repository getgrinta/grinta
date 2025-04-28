import type { z } from "zod";
import type { SpaceSchema, SpaceTabSchema } from "./schema";

export type Attachment = { tabId: number; content: string };
export type SpaceData = z.infer<typeof SpaceSchema>;
export type SpaceTab = z.infer<typeof SpaceTabSchema>;
