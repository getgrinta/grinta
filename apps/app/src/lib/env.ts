import { env as publicEnv } from "$env/dynamic/public";
import { z } from "zod";

export const env = z
	.object({
		PUBLIC_API_URL: z.string().url(),
		PUBLIC_ENCRYPTION_KEY: z.string(),
	})
	.parse(publicEnv);
