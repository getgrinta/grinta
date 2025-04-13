import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import { createRouter } from "../utils/router.utils.js";

const getCurrencyDataUrl = (ticker: string) =>
  `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${ticker}.json`;

export const CurrencyDataSchema = z.record(z.string(), z.number());

const CURRENCY_ROUTE = createRoute({
  method: "get",
  path: "/currency/{ticker}",
  responses: {
    200: {
      description: "Currency data",
      content: { "application/json": { schema: CurrencyDataSchema } },
    },
  },
});

export const dataRouter = createRouter().openapi(CURRENCY_ROUTE, async (c) => {
  const ticker = c.req.param("ticker");
  const url = getCurrencyDataUrl(ticker);
  const response = await fetch(url);
  const data = await response.json();
  c.header("Cache-Control", "public, max-age=28800");
  c.header("Expires", new Date(Date.now() + 8 * 60 * 60 * 1000).toUTCString());
  return c.json(CurrencyDataSchema.parse(data[ticker]), 200);
});
