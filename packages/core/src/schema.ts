import { z } from "zod";

export const APP_MODE = {
	INITIAL: "INITIAL",
	MENU: "MENU",
	NOTES: "NOTES",
	CLIPBOARD: "CLIPBOARD",
} as const;

export const appModeEnum = z.nativeEnum(APP_MODE);

export const customizableAppModeEnum = z.union([appModeEnum, z.string()]);

export const SEARCH_MODE = {
	WEB: "WEB",
	AI: "AI",
} as const;

// The order is important for command sorting.
export const COMMAND_HANDLER = {
	SYSTEM: "SYSTEM",
	APP: "APP",
	CHANGE_MODE: "CHANGE_MODE",
	COPY_TO_CLIPBOARD: "COPY_TO_CLIPBOARD",
	RUN_SHORTCUT: "RUN_SHORTCUT",
	OPEN_NOTE: "OPEN_NOTE",
	CREATE_NOTE: "CREATE_NOTE",
	URL: "URL",
	EMBEDDED_URL: "EMBEDDED_URL",
	FS_ITEM: "FS_ITEM",
} as const;

export const commandHandlerEnum = z.nativeEnum(COMMAND_HANDLER);

export const customizableCommandHandlerEnum = z.union([
	commandHandlerEnum,
	z.string(),
]);

export const MetadataSchema = z.object({
	contentType: z.string().optional(),
	path: z.string().optional(),
});

export const ExecutableCommandSchema = z.object({
	label: z.string(),
	localizedLabel: z.string(),
	value: z.string(),
	metadata: MetadataSchema.default({}),
	handler: customizableCommandHandlerEnum,
	appModes: z.array(customizableAppModeEnum),
	smartMatch: z.boolean().default(false),
	priority: z.number().default(0),
	historical: z.boolean().default(false),
});
