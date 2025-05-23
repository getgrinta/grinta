import "dotenv/config";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { auth } from "./auth/index.js";
import { aiRouter } from "./routers/ai.router.js";
import { dataRouter } from "./routers/data.router.js";
import { docsRouter } from "./routers/docs.router.js";
import { usersRouter } from "./routers/users.router.js";
import { pinoLogger } from "hono-pino";
import {
  authSession,
  authenticatedGuard,
  createRouter,
  databaseContext,
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
  .use(authSession)
  .use("/api/ai/*", authenticatedGuard)
  .use("/api/users/*", authenticatedGuard)
  .on(["POST", "GET"], "/api/auth/*", (c) => {
    return auth.handler(c.req.raw);
  })
  .route("/api/ai", aiRouter)
  .route("/api/users", usersRouter)
  .route("/api/data", dataRouter)
  .route("/docs", docsRouter);

export type AppType = typeof app;

export type { ContentType } from "./routers/ai.router.js";
export type { SanitizedSubscription } from "./utils/schema.utils.js";

serve({
  fetch: app.fetch,
  port: process.env["PORT"] ? Number.parseInt(process.env["PORT"]) : 3000,
});
