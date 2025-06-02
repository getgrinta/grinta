import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "../utils/router.utils.js";
import { schema } from "../db/schema.js";
import { eq } from "drizzle-orm";

export const UpsertSyncDataSchema = z.object({
    data: z.string(),
    type: z.enum(["tabs"]).default("tabs"),
});

export const UpsertSyncDataRoute = createRoute({
    method: "post",
    path: "/sync",
    request: {
        body: {
            content: {
                "application/json": {
                    schema: UpsertSyncDataSchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: "Sync data upserted",
            content: { "application/json": { schema: z.object({ id: z.string() }) } },
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

export const realtimeRouter = createRouter().openapi(UpsertSyncDataRoute, async (c) => {
    const wsContext = c.get("ws");
    const user = c.get("user");
    if (!user) return c.text("Unauthorized", 401);
    const db = c.get("db");
    const body = UpsertSyncDataSchema.parse(await c.req.json());
    const existingSyncData = await db.query.syncData.findFirst({
        where: eq(schema.syncData.userId, user.id),
    });
    const wsClients = wsContext.clients.entries().filter(([key]) => {
        return key.startsWith(user.id + ":");
    }).map(([_, ws]) => ws);
    if (existingSyncData) {
        await db
            .update(schema.syncData)
            .set({ data: body.data, type: body.type })
            .where(eq(schema.syncData.id, existingSyncData.id));
        wsClients.forEach((ws) => {
            ws.send(JSON.stringify({ type: "syncData", data: existingSyncData.data }));
        });
        return c.json({ id: existingSyncData.id }, 200);
    }
    const [syncData] = await db
        .insert(schema.syncData)
        .values({ userId: user.id, data: body.data, type: body.type })
        .returning();
    wsClients.forEach((ws) => {
        ws.send(JSON.stringify({ type: "syncData", data: syncData.data }));
    });
    return c.json({ id: syncData.id }, 200);
});
