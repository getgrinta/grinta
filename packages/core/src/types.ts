import type { z } from "zod";
import type {
	APP_MODE,
	COMMAND_HANDLER,
	ExecutableCommandSchema,
	MetadataSchema,
	SEARCH_MODE,
} from "./schema";

export type AppMode = keyof typeof APP_MODE;

export type SearchMode = keyof typeof SEARCH_MODE;

export type CommandHandler = keyof typeof COMMAND_HANDLER;

export type Metadata = z.infer<typeof MetadataSchema>;

export type ExecutableCommand = z.infer<typeof ExecutableCommandSchema>;
