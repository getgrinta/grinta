import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import { auth } from "../auth";
import { createRouter } from "../utils/router.utils";

export const MeSchema = z.object({
	id: z.string(),
	name: z.string(),
	email: z.string(),
	emailVerified: z.boolean(),
	image: z.string().nullable(),
});

export const authRouter = createRouter();

const ME_ROUTE = createRoute({
	method: "get",
	path: "/me",
	responses: {
		200: {
			description: "Get current user",
			content: { "application/json": { schema: MeSchema } },
		},
		401: {
			description: "Unauthorized",
			content: { "text/plain": { schema: z.string() } },
		},
	},
});

authRouter.openapi(ME_ROUTE, (c) => {
	const user = c.get("user");
	if (!user) return c.text("Unauthorized", 401);
	const sanitizedUser = MeSchema.parse(user);
	return c.json(sanitizedUser, 200);
});

authRouter.on(["POST", "GET"], "*", (c) => {
	return auth.handler(c.req.raw);
});
