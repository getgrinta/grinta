import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import { env } from "../utils/env.utils.js";
import { createRouter } from "../utils/router.utils.js";
import {
  sanitizedSubscriptionSchema,
  subscriptionSchema,
} from "../utils/schema.utils.js";

export const MeSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  subscriptions: z.array(sanitizedSubscriptionSchema),
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
  const subscriptions = z
    .array(subscriptionSchema)
    .parse(request.ok ? await request.json() : [])
    .filter((subscription) =>
      ["active", "trialing"].includes(subscription.status),
    );
  const sanitizedSubscriptions = subscriptions.map((subscription) => ({
    plan: subscription.plan,
    status: subscription.status,
    periodEnd: subscription.periodEnd,
  }));
  const sanitizedUser = MeSchema.parse({
    ...user,
    subscriptions: sanitizedSubscriptions,
  });
  return c.json(sanitizedUser, 200);
});
