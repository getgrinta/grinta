import { z } from "zod";

export const EnvSchema = z.object({
	BETTER_AUTH_SECRET: z.string(),
	BETTER_AUTH_URL: z.string().url(),
	DATABASE_URL: z.string().url(),
	RESEND_API_KEY: z.string(),
	MISTRAL_API_KEY: z.string(),
	STRIPE_SECRET_KEY: z.string(),
	STRIPE_WEBHOOK_SECRET: z.string(),
});

export const env = EnvSchema.parse(process.env);
