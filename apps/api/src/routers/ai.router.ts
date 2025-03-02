import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import { AI_MODELS, AiProviderEnum } from "../const";
import { AiService, ModelSchema } from "../services/ai.service";
import { createRouter } from "../utils/router.utils";

const aiService = new AiService();

export const GenerateParamsSchema = z.object({
	prompt: z.string(),
	context: z.string(),
	provider: AiProviderEnum,
	model: z.string(),
});

export const GenerateNoteResult = z.object({
	text: z.string(),
});

export const aiRouter = createRouter();

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

aiRouter.openapi(MODELS_ROUTE, (c) => {
	return c.json(AI_MODELS);
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
			description: "Note generate result",
			content: { "application/json": { schema: GenerateNoteResult } },
		},
		401: {
			description: "Unauthorized",
			content: { "text/plain": { schema: z.string() } },
		},
	},
});

aiRouter.openapi(GENERATE_ROUTE, (c) => {
	return c.json(AI_MODELS, 200);
});

const AUTOCOMPLETE_ROUTE = createRoute({
	method: "post",
	path: "/autocomplete",
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
			description: "Autocomplete result",
			content: { "application/json": { schema: GenerateNoteResult } },
		},
		401: {
			description: "Unauthorized",
			content: { "text/plain": { schema: z.string() } },
		},
	},
});

aiRouter.openapi(AUTOCOMPLETE_ROUTE, async (c) => {
	const user = c.get("user");
	if (!user) return c.text("Unauthorized", 401);
	const body = GenerateParamsSchema.parse(await c.req.json());
	const text = await aiService.generateAutocompletion(body);
	return c.json({ text }, 200);
});
