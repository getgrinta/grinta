import { OpenAPIHono } from "@hono/zod-openapi";
import type { auth } from "../auth";

export function createRouter() {
	return new OpenAPIHono<{
		Variables: {
			user: typeof auth.$Infer.Session.user | null;
			session: typeof auth.$Infer.Session.session | null;
		};
	}>();
}
