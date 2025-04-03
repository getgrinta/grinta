import { apiReference } from "@scalar/hono-api-reference";
import { createRouter } from "../utils/router.utils.js";

export const docsRouter = createRouter().get(
	"/reference",
	apiReference({
		theme: "kepler",
		url: "/openapi.json",
	}),
);
