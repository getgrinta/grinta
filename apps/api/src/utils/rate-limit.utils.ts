import { RateLimit } from "@rlimit/http";
import { MiddlewareHandler } from "hono";

const rlimit = new RateLimit({
  namespace: "grinta",
  maximum: 5,
  interval: "10s",
});

export const rateLimitMiddleware: MiddlewareHandler = async (c, next) => {
  // use x-forwarded-for or x-real-ip if available
  const identifier =
    c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "anon";

  // check if the request is within the limit
  const limit = await rlimit.check(identifier);
  console.info(limit);

  if (!limit.ok) {
    return c.text("too many requests", 429);
  }

  await next();
};
