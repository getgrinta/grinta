import type { z } from "zod/v3";
import type { SpaceSchema, SpaceTabSchema, OpenerSchema } from "./schema";
import type { DragDropOptions } from "@thisux/sveltednd";

export type PageContext = { url: string; title: string; content: string };
export type SpaceData = z.infer<typeof SpaceSchema>;
export type SpaceTab = z.infer<typeof SpaceTabSchema>;
export type Opener = z.infer<typeof OpenerSchema>;

export interface DraggableOptions<T> extends DragDropOptions<T> {
  interactive?: string[];
}
