import { OpenAPIHono } from "@hono/zod-openapi";
import type { auth } from "./auth";
import { aiRouter } from "./routers/ai.router";
import { authRouter } from "./routers/auth.router";
import { docsRouter } from "./routers/docs.router";
import { authSession } from "./utils/router.utils";

const app = new OpenAPIHono<{
	Variables: {
		user: typeof auth.$Infer.Session.user | null;
		session: typeof auth.$Infer.Session.session | null;
	};
}>();

app.use("*", authSession);

app.route("/api/ai", aiRouter);
app.route("/api/auth", authRouter);
app.route("/docs", docsRouter);

app.doc("/openapi.json", {
	openapi: "3.0.0",
	info: {
		version: "1.0.0",
		title: "Grinta",
	},
});

export default app;
