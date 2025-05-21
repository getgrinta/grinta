import type { z } from "zod/v3";
import type {
  APP_MODE,
  COMMAND_HANDLER,
  ExecutableCommandSchema,
  ChatMessageSchema,
  MetadataSchema,
  SEARCH_ENGINE,
  SettingsSchema,
} from "./schema";

export type AppMode = keyof typeof APP_MODE;

export type CommandHandler = keyof typeof COMMAND_HANDLER;

export type Metadata = z.infer<typeof MetadataSchema>;

export type ExecutableCommand = z.infer<typeof ExecutableCommandSchema>;

export type SearchEngine = keyof typeof SEARCH_ENGINE;

export type Settings = z.infer<typeof SettingsSchema>;

export type Note = {
  title: string;
  filename: string;
  path: string;
  updatedAt: string;
};

export type ChatMessageData = z.infer<typeof ChatMessageSchema>;
