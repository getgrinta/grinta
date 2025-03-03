import { OpenAPIHono } from "@hono/zod-openapi";
import { createMiddleware } from "hono/factory";
import type { auth } from "../auth";

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
