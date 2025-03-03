import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import { AI_AUTOCOMPLETE_MODELS, AI_PROVIDER, AiProviderEnum } from "../const";
import { AiService, ModelSchema } from "../services/ai.service";
import { authenticatedGuard, createRouter } from "../utils/router.utils";

const aiService = new AiService();

export const AutocompleteParamsSchema = z.object({
	prompt: z.string(),
	context: z.string(),
});

export const GenerateParamsSchema = AutocompleteParamsSchema.extend({
	provider: AiProviderEnum,
	model: z.string(),
});

export const GenerateNoteResult = z.object({
	text: z.string(),
});

export const aiRouter = createRouter();

aiRouter.use(authenticatedGuard);

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
	return c.json(AI_AUTOCOMPLETE_MODELS);
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
		},
		401: {
			description: "Unauthorized",
			content: { "text/plain": { schema: z.string() } },
		},
	},
});

aiRouter.openapi(GENERATE_ROUTE, async (c) => {
	const params = GenerateParamsSchema.parse(await c.req.json());
	const streamingResponse = aiService.generateNote(params);
	return streamingResponse;
});

const AUTOCOMPLETE_ROUTE = createRoute({
	method: "post",
	path: "/autocomplete",
	request: {
		body: {
			content: {
				"application/json": {
					schema: AutocompleteParamsSchema,
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
	const params = AutocompleteParamsSchema.parse(await c.req.json());
	const body = {
		...params,
		provider: AI_PROVIDER.MISTRAL,
		model: "mistral-small-latest",
	};
	const text = await aiService.generateAutocompletion(body);
	return c.json({ text }, 200);
});
