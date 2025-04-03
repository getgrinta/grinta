import { OpenAPIHono } from "@hono/zod-openapi";
import { createMiddleware } from "hono/factory";
import { auth } from "../auth/index.js";
import { db } from "../db/index.js";
import { eq } from "drizzle-orm";
import { schema } from "../db/schema.js";

export function createRouter() {
	return new OpenAPIHono<{
		Variables: {
			user: typeof auth.$Infer.Session.user | null;
			session: typeof auth.$Infer.Session.session | null;
			subscriptions: (typeof schema.subscription)[];
			db: typeof db;
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
		c.set("subscriptions", null);
		return next();
	}
	c.set("user", session.user);
	c.set("session", session.session);
	const subscriptions = await db.query.subscription.findMany({
		where: eq(schema.subscription.referenceId, session.user.id),
	});
	c.set("subscriptions", subscriptions);
	return next();
});

export const databaseContext = createMiddleware(async (c, next) => {
	c.set("db", db);
	return next();
});
