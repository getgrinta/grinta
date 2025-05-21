import { apiClient, authClient } from "./lib/auth";
import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (context, next) => {
  const { data } = await authClient.getSession({
    fetchOptions: { headers: context.request.headers },
  });
  if (data) {
    try {
      const profileRequest = await fetch(apiClient.api?.users.me.$url(), {
        headers: context.request.headers,
      });
      context.locals.profile = await profileRequest.json();
    } catch (error) {
      console.error(error);
      context.locals.profile = null;
    }
    context.locals.user = data.user;
    context.locals.session = data.session;
  } else {
    context.locals.user = null;
    context.locals.session = null;
    context.locals.profile = null;
  }
  return next();
});
