import { drizzle } from "drizzle-orm/bun-sql";
import { env } from "../utils/env.utils";
import { schema } from "./schema";

const client = new Bun.SQL(env.DATABASE_URL);

export const db = drizzle({ client, schema });
