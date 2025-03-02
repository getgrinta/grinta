import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import { auth } from "../auth";
import { validation } from "../db/schema";
import { createRouter } from "../utils/router.utils";

export const authRouter = createRouter();

const ME_ROUTE = createRoute({
	method: "get",
	path: "/me",
	responses: {
		200: {
			description: "Get current user",
			content: { "application/json": { schema: validation.selectUser } },
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
	const sanitizedUser = {
		...user,
		image: user.image ?? null,
	};
	return c.json(sanitizedUser, 200);
});

authRouter.on(["POST", "GET"], "*", (c) => {
	return auth.handler(c.req.raw);
});
