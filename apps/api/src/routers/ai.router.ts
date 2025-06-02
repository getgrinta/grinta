import { createRoute, z } from "@hono/zod-openapi";
import { AI_PROVIDER } from "../const.js";
import { AiService } from "../services/ai.service.js";
import { aiLimitGuard, createRouter } from "../utils/router.utils.js";
import { schema } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { until } from "@open-draft/until";
import { ChatMessageSchema } from "@getgrinta/core";
import { stream } from "hono/streaming";
import { ElevenLabsClient } from "elevenlabs";
import { env } from "../utils/env.utils.js";

const elevenLabsClient = new ElevenLabsClient({
  apiKey: env.ELEVENLABS_API_KEY,
});

const MODEL = "mistral-small-latest";
const aiService = new AiService();

export const CONTENT_TYPE = {
  AUTOCOMPLETION: "AUTOCOMPLETION",
  INLINE_AI: "INLINE_AI",
  REPHRASE: "REPHRASE",
  GRINTAI: "GRINTAI",
  CHAT_TITLE: "CHAT_TITLE",
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

export const TranscribeResult = z.object({
  text: z.string(),
});

export const StreamParamsSchema = z.object({
  messages: z.array(ChatMessageSchema as never),
});

export const SpeechParamsSchema = z.any();

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
      description: "AI stream result",
      content: { "text/plain": { schema: z.any() } },
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

const STREAM_RAW_ROUTE = createRoute({
  method: "post",
  path: "/stream-raw",
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
      description: "AI stream result",
      content: { "text/plain": { schema: z.any() } },
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

const SPEECH_ROUTE = createRoute({
  method: "post",
  path: "/speech",
  request: {
    body: {
      content: {
        "multipart/form-data": {
          schema: SpeechParamsSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Speech to text",
      content: { "application/json": { schema: TranscribeResult } },
    },
    400: {
      description: "Bad Request",
      content: { "text/plain": { schema: z.string() } },
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

export const aiRouter = createRouter()
  .openapi(GENERATE_ROUTE, async (c) => {
    const user = c.get("user");
    if (!user) return c.text("Unauthorized", 401);
    const db = c.get("db");
    const [aiUsage] = await db
      .insert(schema.aiUsage)
      .values({ userId: user.id, model: MODEL })
      .returning();
    const params = GenerateParamsSchema.parse(await c.req.json());
    const body = {
      ...params,
      provider: AI_PROVIDER.MISTRAL,
      model: MODEL,
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
  })
  .openapi(STREAM_ROUTE, async (c) => {
    const user = c.get("user");
    if (!user) return c.text("Unauthorized", 401);
    const db = c.get("db");
    const [aiUsage] = await db
      .insert(schema.aiUsage)
      .values({ userId: user.id, model: MODEL })
      .returning();
    try {
      const params = StreamParamsSchema.parse(await c.req.json());
      const result = aiService.streamResponse(params as never, async () => {
        await db
          .update(schema.aiUsage)
          .set({ state: "success" })
          .where(eq(schema.aiUsage.id, aiUsage.id));
      });
      return stream(c, async (stream) => {
        c.header("X-Vercel-AI-Data-Stream", "v1");
        c.header("Content-Type", "text/plain; charset=utf-8");
        await stream.pipe(result.toDataStream());
      }) as never;
    } catch (error) {
      console.error(error);
      await db
        .update(schema.aiUsage)
        .set({ state: "error" })
        .where(eq(schema.aiUsage.id, aiUsage.id));
      return c.text("Internal Server Error", 500);
    }
  })
  .openapi(STREAM_RAW_ROUTE, async (c) => {
    const user = c.get("user");
    if (!user) return c.text("Unauthorized", 401);
    const db = c.get("db");
    const [aiUsage] = await db
      .insert(schema.aiUsage)
      .values({ userId: user.id, model: MODEL })
      .returning();
    try {
      const params = StreamParamsSchema.parse(await c.req.json());
      const result = aiService.streamResponseRaw(params as never, async () => {
        await db
          .update(schema.aiUsage)
          .set({ state: "success" })
          .where(eq(schema.aiUsage.id, aiUsage.id));
      });
      return stream(c, async (stream) => {
        c.header("X-Vercel-AI-Data-Stream", "v1");
        c.header("Content-Type", "text/plain; charset=utf-8");
        await stream.pipe(result.toDataStream());
      }) as never;
    } catch (error) {
      console.error(error);
      await db
        .update(schema.aiUsage)
        .set({ state: "error" })
        .where(eq(schema.aiUsage.id, aiUsage.id));
      return c.text("Internal Server Error", 500);
    }
  })
  .openapi(SPEECH_ROUTE, async (c) => {
    const user = c.get("user");
    if (!user) return c.text("Unauthorized", 401);
    const db = c.get("db");
    const [aiUsage] = await db
      .insert(schema.aiUsage)
      .values({ userId: user.id, model: MODEL })
      .returning();
    try {
      const formData = await c.req.formData();
      const file = formData.get("speech");
      if (!(file instanceof File)) return c.text("Missing audio file", 400);
      try {
        const transcription = await elevenLabsClient.speechToText.convert({
          file,
          model_id: "scribe_v1",
          diarize: false,
        });
        await db
          .update(schema.aiUsage)
          .set({ state: "success" })
          .where(eq(schema.aiUsage.id, aiUsage.id));
        return c.json({ text: transcription.text }, 200);
      } catch (error) {
        console.error(error);
        await db
          .update(schema.aiUsage)
          .set({ state: "error" })
          .where(eq(schema.aiUsage.id, aiUsage.id));
        return c.text("Internal Server Error", 500);
      }
    } catch (error) {
      console.error(error);
      await db
        .update(schema.aiUsage)
        .set({ state: "error" })
        .where(eq(schema.aiUsage.id, aiUsage.id));
      return c.text("Internal Server Error", 500);
    }
  })
  .use(aiLimitGuard);
