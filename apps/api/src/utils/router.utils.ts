import { OpenAPIHono } from "@hono/zod-openapi";
import { createMiddleware } from "hono/factory";
import { auth } from "../auth/index.js";

export function createRouter() {
	return new OpenAPIHono<{
		Variables: {
			user: typeof auth.$Infer.Session.user | null;
			session: typeof auth.$Infer.Session.session | null;
		};
	}>();
}

export const authenticatedGuard = createMiddleware(async (c, next) => {
	const user = c.get("user");
	if (!user) return c.text("Unauthorized", 401);
	return next();
});

export const authSession = createMiddleware(async (c, next) => {
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
