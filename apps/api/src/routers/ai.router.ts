import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import { AI_AUTOCOMPLETE_MODELS, AI_PROVIDER } from "../const.js";
import { AiService, ModelSchema } from "../services/ai.service.js";
import { createRouter } from "../utils/router.utils.js";
import { schema } from "../db/schema.js";
import { and, count, eq, gte } from "drizzle-orm";
import { until } from "@open-draft/until";
import type { Database } from "../db/index.js";

const aiService = new AiService();

export const CONTENT_TYPE = {
	AUTOCOMPLETION: "AUTOCOMPLETION",
	INLINE_AI: "INLINE_AI",
	REPHRASE: "REPHRASE",
} as const;

export const ContentTypeEnum = z.nativeEnum(CONTENT_TYPE);

export type ContentType = z.infer<typeof ContentTypeEnum>;

export const GenerateParamsSchema = z.object({
	prompt: z.string().max(4096, "Prompt must be at most 4096 characters long"),
	context: z.string().max(8192, "Context must be at most 8192 characters long"),
	contentType: ContentTypeEnum,
});

export const GenerateNoteResult = z.object({
	text: z.string(),
});

const MODELS_ROUTE = createRoute({
	method: "get",
	path: "/models",
	responses: {
		200: {
			description: "List AI models",
			content: { "application/json": { schema: z.array(ModelSchema) } },
		},
	},
});

const GENERATE_ROUTE = createRoute({
	method: "post",
	path: "/generate",
	request: {
		body: {
			content: {
				"application/json": {
					schema: GenerateParamsSchema,
				},
			},
		},
	},
	responses: {
		200: {
			description: "AI generation result",
			content: { "application/json": { schema: GenerateNoteResult } },
		},
		401: {
			description: "Unauthorized",
			content: { "text/plain": { schema: z.string() } },
		},
		403: {
			description: "Forbidden",
			content: { "text/plain": { schema: z.string() } },
		},
		500: {
			description: "Internal Server Error",
			content: { "text/plain": { schema: z.string() } },
		},
	},
});

async function getUsages({
	db,
	userId,
	dateFrom,
}: { db: Database; userId: string; dateFrom: Date }) {
	return db
		.select({ count: count() })
		.from(schema.aiUsage)
		.where(
			and(
				eq(schema.aiUsage.userId, userId),
				gte(schema.aiUsage.createdAt, dateFrom),
			),
		);
}

export const aiRouter = createRouter()
	.openapi(MODELS_ROUTE, (c) => {
		return c.json(AI_AUTOCOMPLETE_MODELS);
	})
	.openapi(GENERATE_ROUTE, async (c) => {
		const model = "mistral-small-latest";
		const user = c.get("user");
		if (!user) return c.text("Unauthorized", 401);
		const subscriptions = c.get("subscriptions");
		if (subscriptions.length === 0)
			return c.text("You have no active subscriptions", 403);
		const db = c.get("db");
		const [usagesLastDay] = await getUsages({
			db,
			userId: user.id,
			dateFrom: new Date(Date.now() - 24 * 60 * 60 * 1000),
		});
		if (usagesLastDay.count >= 500)
			return c.text("You have reached the daily limit of 500 AI usages", 403);
		const [usagesLastHour] = await getUsages({
			db,
			userId: user.id,
			dateFrom: new Date(Date.now() - 60 * 60 * 1000),
		});
		if (usagesLastHour.count >= 64)
			return c.text("You have reached the hourly limit of 64 AI usages", 403);
		const [aiUsage] = await db
			.insert(schema.aiUsage)
			.values({ userId: user.id, model })
			.returning();
		const params = GenerateParamsSchema.parse(await c.req.json());
		const body = {
			...params,
			provider: AI_PROVIDER.MISTRAL,
			model,
		};
		const { data, error } = await until(() => aiService.generateResponse(body));
		if (error) {
			await db
				.update(schema.aiUsage)
				.set({ state: "error" })
				.where(eq(schema.aiUsage.id, aiUsage.id));
			return c.text(error.message, 500);
		}
		await db
			.update(schema.aiUsage)
			.set({ state: "success" })
			.where(eq(schema.aiUsage.id, aiUsage.id));
		return c.json({ text: data }, 200);
	});
