import { apiClient, authClient } from "./lib/auth";
import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (context, next) => {
    const { data } = await authClient.getSession({ fetchOptions: { headers: context.request.headers } })
    if (data) {
        const profileRequest = await fetch(apiClient.api.users.me.$url(), {
            headers: context.request.headers
        })
        const profile = await profileRequest.json()
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
