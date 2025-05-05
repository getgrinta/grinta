import type { z } from "zod";
import type { SpaceSchema, SpaceTabSchema, OpenerSchema } from "./schema";

export type PageContext = { url: string; title: string; content: string };
export type SpaceData = z.infer<typeof SpaceSchema>;
export type SpaceTab = z.infer<typeof SpaceTabSchema>;
export type Opener = z.infer<typeof OpenerSchema>;
