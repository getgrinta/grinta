import { logger } from "hono/logger";
import { auth } from "./auth/index.js";
import { aiRouter } from "./routers/ai.router.js";
import { docsRouter } from "./routers/docs.router.js";
import { usersRouter } from "./routers/users.router.js";
import {
	authSession,
	authenticatedGuard,
	createRouter,
} from "./utils/router.utils.js";

const app = createRouter()
	.doc("/openapi.json", {
		openapi: "3.0.0",
		info: {
			version: "1.0.0",
			title: "Grinta",
		},
	})
	.use(logger())
	.use("*", authSession)
	.use("/api/ai/*", authenticatedGuard)
	.use("/api/users/*", authenticatedGuard)
	.on(["POST", "GET"], "/api/auth/*", (c) => {
		return auth.handler(c.req.raw);
	})
	.route("/api/ai", aiRouter)
	.route("/api/users", usersRouter)
	.route("/docs", docsRouter);

export type AppType = typeof app;

export type { ContentType } from "./routers/ai.router.js";
export type { SanitizedSubscription } from "./utils/schema.utils.js";

export default app;
