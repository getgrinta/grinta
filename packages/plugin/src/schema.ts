import { APP_MODE } from "@getgrinta/core";
import { z } from "zod";

export const AppStateContextSchema = z.object({
	query: z.string().default(""),
	appMode: z.nativeEnum(APP_MODE).default(APP_MODE.INITIAL),
});
