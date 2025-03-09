import { auth } from "./auth/index.js";
import { aiRouter } from "./routers/ai.router.js";
import { authRouter } from "./routers/auth.router.js";
import { docsRouter } from "./routers/docs.router.js";
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
	.use("*", authSession)
	.use("/api/ai/*", authenticatedGuard)
	.on(["POST", "GET"], "/api/ai/*", (c) => {
		return auth.handler(c.req.raw);
	})
	.route("/api/ai", aiRouter)
	.route("/api/auth", authRouter)
	.route("/docs", docsRouter);

export type AppType = typeof app;

export type { ContentType } from "./routers/ai.router.js";

export default app;
