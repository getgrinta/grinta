import { createRoute } from "@hono/zod-openapi";
import { stream } from "hono/streaming";
import { z } from "zod";
import {
	AI_AUTOCOMPLETE_MODELS,
	AI_PROVIDER,
	AiProviderEnum,
} from "../const.js";
import { AiService, ModelSchema } from "../services/ai.service.js";
import { createRouter } from "../utils/router.utils.js";

const aiService = new AiService();

export const CONTENT_TYPE = {
	AUTOCOMPLETION: "AUTOCOMPLETION",
	INLINE_AI: "INLINE_AI",
	REPHRASE: "REPHRASE",
} as const;

export const ContentTypeEnum = z.nativeEnum(CONTENT_TYPE);

export type ContentType = z.infer<typeof ContentTypeEnum>;

export const GenerateParamsSchema = z.object({
	prompt: z.string(),
	context: z.string(),
	contentType: ContentTypeEnum,
});

export const StreamParamsSchema = z.object({
	prompt: z.string(),
	context: z.string(),
	provider: AiProviderEnum,
	model: z.string(),
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

const STREAM_ROUTE = createRoute({
	method: "post",
	path: "/stream",
	request: {
		body: {
			content: {
				"application/json": {
					schema: StreamParamsSchema,
				},
			},
		},
	},
	responses: {
		200: {
			description: "Streaming note generation response",
		},
		401: {
			description: "Unauthorized",
			content: { "text/plain": { schema: z.string() } },
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
	},
});

export const aiRouter = createRouter()
	.openapi(MODELS_ROUTE, (c) => {
		return c.json(AI_AUTOCOMPLETE_MODELS);
	})
	.openapi(STREAM_ROUTE, async (c) => {
		const params = StreamParamsSchema.parse(await c.req.json());
		c.header("X-Vercel-AI-Data-Stream", "v1");
		c.header("Content-Type", "text/plain; charset=utf-8");
		const streamResult = aiService.streamResponse(params);
		return stream(c, (stream) => stream.pipe(streamResult));
	})
	.openapi(GENERATE_ROUTE, async (c) => {
		const params = GenerateParamsSchema.parse(await c.req.json());
		const body = {
			...params,
			provider: AI_PROVIDER.MISTRAL,
			model: "mistral-small-latest",
		};
		const text = await aiService.generateResponse(body);
		return c.json({ text }, 200);
	});
