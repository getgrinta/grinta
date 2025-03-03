import { apiReference } from "@scalar/hono-api-reference";
import { createRouter } from "../utils/router.utils";

export const docsRouter = createRouter();

docsRouter.get(
	"/reference",
	apiReference({
		theme: "kepler",
		spec: {
			url: "/openapi.json",
		},
	}),
);
