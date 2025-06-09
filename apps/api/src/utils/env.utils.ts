import { z } from "zod/v3";

export const EnvSchema = z.object({
  NODE_ENV: z.string().default("development"),
  BETTER_AUTH_SECRET: z.string(),
  BETTER_AUTH_URL: z.string().url(),
  DATABASE_URL: z.string().url(),
  RESEND_API_KEY: z.string(),
  MISTRAL_API_KEY: z.string(),
  ELEVENLABS_API_KEY: z.string(),
  STRIPE_SECRET_KEY: z.string(),
  STRIPE_WEBHOOK_SECRET: z.string(),
  STRIPE_PRICE_ID: z.string(),
  LOGS_WEBHOOK_URL: z.string().url().optional(),
  AI_DAILY_LIMIT: z.coerce.number().default(50),
  AI_DAILY_LIMIT_PRO: z.coerce.number().default(250),
});

export const env = EnvSchema.parse(process.env);
