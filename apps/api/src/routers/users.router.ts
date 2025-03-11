import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import { env } from "../utils/env.utils.js";
import { createRouter } from "../utils/router.utils.js";

export const MeSchema = z.object({
	id: z.string(),
	name: z.string(),
	email: z.string(),
	emailVerified: z.boolean(),
	image: z.string().nullable(),
	subscription: z.any(),
});

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

export const usersRouter = createRouter().openapi(ME_ROUTE, async (c) => {
	const user = c.get("user");
	const request = await fetch(
		`${env.BETTER_AUTH_URL}/api/auth/subscription/list`,
		{
			headers: {
				Cookie: c.req.header("Cookie") ?? "",
			},
		},
	);
	const subscription = request.ok ? await request.json() : {};
	const sanitizedUser = MeSchema.parse({ ...user, subscription });
	return c.json(sanitizedUser, 200);
});
