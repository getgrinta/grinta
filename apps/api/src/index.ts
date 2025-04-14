import { logger } from "hono/logger";
import { HTTPException } from "hono/http-exception";
import { auth } from "./auth/index.js";
import { aiRouter } from "./routers/ai.router.js";
import { dataRouter } from "./routers/data.router.js";
import { docsRouter } from "./routers/docs.router.js";
import { usersRouter } from "./routers/users.router.js";
import {
  authSession,
  authenticatedGuard,
  createRouter,
  databaseContext,
} from "./utils/router.utils.js";
import { sendWebhook } from "./utils/webhook.utils.js";

const app = createRouter()
  .doc("/openapi.json", {
    openapi: "3.0.0",
    info: {
      version: "1.0.0",
      title: "Grinta",
    },
  })
  .use(logger())
  .onError(async (error, c) => {
    await sendWebhook({
      type: "logs",
      message: error.message,
    });
    if (error instanceof HTTPException) {
      return error.getResponse();
    }
    return c.text("Internal Server Error", 500);
  })
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

export default {
  port: 3000,
  fetch: app.fetch,
};
