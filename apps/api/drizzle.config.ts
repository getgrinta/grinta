import { defineConfig } from "drizzle-kit";
import { env } from "./src/utils/env.utils.js";

export default defineConfig({
	dialect: "postgresql",
	schema: "./src/db/schema.ts",
	dbCredentials: {
		url: env.DATABASE_URL,
	},
});
