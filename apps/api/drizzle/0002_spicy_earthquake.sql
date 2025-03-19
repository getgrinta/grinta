ALTER TABLE "ai_usage" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "ai_usage" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();