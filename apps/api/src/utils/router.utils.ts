import { OpenAPIHono } from "@hono/zod-openapi";
import { createMiddleware } from "hono/factory";
import { auth } from "../auth/index.js";
import { db, type Database } from "../db/index.js";
import { and, count, eq, gte, or } from "drizzle-orm";
import { schema } from "../db/schema.js";
import { env } from "./env.utils.ts";

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
    where: and(
      eq(schema.subscription.referenceId, session.user.id),
      or(
        eq(schema.subscription.status, "active"),
        eq(schema.subscription.status, "trialing"),
      ),
    ),
  });
  c.set("subscriptions", subscriptions);
  return next();
});

export const databaseContext = createMiddleware(async (c, next) => {
  c.set("db", db);
  return next();
});

async function getUsages({
  db,
  userId,
  dateFrom,
}: {
  db: Database;
  userId: string;
  dateFrom: Date;
}) {
  return db
    .select({ count: count() })
    .from(schema.aiUsage)
    .where(
      and(
        eq(schema.aiUsage.userId, userId),
        eq(schema.aiUsage.state, "success"),
        gte(schema.aiUsage.createdAt, dateFrom),
      ),
    );
}

export const aiLimitGuard = createMiddleware(async (c, next) => {
  const user = c.get("user");
  if (!user) return c.text("Unauthorized", 401);
  const subscriptions = c.get("subscriptions");
  const dailyUsages =
    subscriptions.length > 0 ? env.AI_DAILY_LIMIT_PRO : env.AI_DAILY_LIMIT;
  const db = c.get("db");
  const [usagesLastDay] = await getUsages({
    db,
    userId: user.id,
    dateFrom: new Date(Date.now() - 24 * 60 * 60 * 1000),
  });
  if (usagesLastDay.count >= dailyUsages)
    return c.text(
      `You have reached the daily limit of ${dailyUsages} AI usages`,
      403,
    );
  return next();
});
