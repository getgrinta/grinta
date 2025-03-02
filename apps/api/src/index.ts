import { OpenAPIHono } from "@hono/zod-openapi";
import { auth } from "./auth";
import { aiRouter } from "./routers/ai.router";
import { authRouter } from "./routers/auth.router";
import { docsRouter } from "./routers/docs.router";

const app = new OpenAPIHono<{
	Variables: {
		user: typeof auth.$Infer.Session.user | null;
		session: typeof auth.$Infer.Session.session | null;
	};
}>();

app.use("*", async (c, next) => {
	const session = await auth.api.getSession({ headers: c.req.raw.headers });
	if (!session) {
		c.set("user", null);
		c.set("session", null);
		return next();
	}
	c.set("user", session.user);
	c.set("session", session.session);
	return next();
});

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
