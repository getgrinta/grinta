import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../utils/env.utils.js";
import { schema } from "./schema.js";

const client = postgres(env.DATABASE_URL);

export const db = drizzle({ client, schema });

export type Database = typeof db;
