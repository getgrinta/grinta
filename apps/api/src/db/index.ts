import { SQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import { env } from "../utils/env.utils";
import { schema } from "./schema";

const client = new SQL(env.DATABASE_URL);

export const db = drizzle({ client, schema });
