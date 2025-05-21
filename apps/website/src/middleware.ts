import { apiClient, authClient } from "./lib/auth";
import { defineMiddleware } from "astro:middleware";

function createSafeHeaders(original: Headers): Headers {
  const headers = new Headers(original);
  if (!headers.getAll) {
    headers.getAll = (name: string) => {
      const value = headers.get(name);
      return value ? [value] : [];
    };
  }
  return headers;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const headers = createSafeHeaders(context.request.headers);
  const { data } = await authClient.getSession({ fetchOptions: { headers } });
  if (data) {
    const profileRequest = await fetch(apiClient.api.users.me.$url(), {
      headers,
    });
    const profile = await profileRequest.json();
    context.locals.user = data.user;
    context.locals.session = data.session;
    context.locals.profile = profile;
  } else {
    context.locals.user = null;
    context.locals.session = null;
    context.locals.profile = null;
  }
  return next();
});
