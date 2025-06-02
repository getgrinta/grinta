import "dotenv/config";
import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import { cors } from "hono/cors";
import { auth } from "./auth/index.js";
import { aiRouter } from "./routers/ai.router.js";
import { dataRouter } from "./routers/data.router.js";
import { realtimeRouter } from "./routers/realtime.router.js";
import { docsRouter } from "./routers/docs.router.js";
import { usersRouter } from "./routers/users.router.js";
import { pinoLogger } from "hono-pino";
import {
  authSession,
  authenticatedGuard,
  createRouter,
  databaseContext,
  wsContext,
} from "./utils/router.utils.js";

const app = createRouter()
  .doc("/openapi.json", {
    openapi: "3.0.0",
    info: {
      version: "1.0.0",
      title: "Grinta",
    },
  })
  .use(
    pinoLogger({
      pino: { level: "info" },
    }),
  )
  .use(
    cors({
      origin: (origin) => {
        return origin;
      },
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["POST", "GET", "OPTIONS"],
      exposeHeaders: ["Content-Length"],
      maxAge: 600,
      credentials: true,
    }),
  )
  .use(databaseContext)
  .use(wsContext)
  .use(authSession)
  .use("/api/ai/*", authenticatedGuard)
  .use("/api/users/*", authenticatedGuard)
  .use("/api/realtime/*", authenticatedGuard)
  .on(["POST", "GET"], "/api/auth/*", (c) => {
    return auth.handler(c.req.raw);
  })
  .route("/api/ai", aiRouter)
  .route("/api/users", usersRouter)
  .route("/api/data", dataRouter)
  .route("/api/realtime", realtimeRouter)
  .route("/docs", docsRouter);

const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

app.get(
  "/api/realtime",
  upgradeWebSocket((c) => {
    return {
      onMessage(event) {
        const data = JSON.parse(event.data.toString());
        if (data.type === "openTab") {
          const wsContext = c.get("ws");
          const user = c.get("user");
          const wsClients = wsContext.clients
            .entries()
            .filter(([key]: [string, WebSocket]) => {
              return key.startsWith(user.id + ":");
            })
            .map(([_, ws]: [string, WebSocket]) => ws);
          wsClients.forEach((ws: WebSocket) => {
            ws.send(JSON.stringify({ type: "openTab", data: data.data }));
          });
        }
      },
      onOpen(_, ws) {
        const session = c.get("session");
        const user = c.get("user");
        const wsContext = c.get("ws");
        if (!session) {
          return ws.close();
        }
        const wsId = user.id + ":" + session.id;
        return wsContext.addClient(wsId, ws);
      },
      onClose() {
        const session = c.get("session");
        const user = c.get("user");
        const wsContext = c.get("ws");
        if (!session) {
          return;
        }
        const wsId = user.id + ":" + session.id;
        return wsContext.removeClient(wsId);
      },
    };
  }),
);

export type AppType = typeof app;

export type { ContentType } from "./routers/ai.router.js";
export type { SanitizedSubscription } from "./utils/schema.utils.js";

const server = serve({
  fetch: app.fetch,
  port: process.env["PORT"] ? Number.parseInt(process.env["PORT"]) : 3000,
});
injectWebSocket(server);
