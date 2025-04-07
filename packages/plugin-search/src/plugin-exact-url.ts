import { createPlugin } from "@getgrinta/plugin";
import { APP_MODE, COMMAND_HANDLER, COMMAND_PRIORITY, ExecutableCommandSchema, HOSTNAME_REGEX } from "@getgrinta/core";

export const PluginExactUrl = createPlugin({
    name: "ExactUrl",
    async addSearchResults(query) {
        if (!HOSTNAME_REGEX.test(query)) {
			return [];
		}
		const value = query.match(/^https?:\/\//) ? query : `https://${query}`;
		const command = ExecutableCommandSchema.parse({
			label: query,
			localizedLabel: query,
			value,
			handler: COMMAND_HANDLER.URL,
			smartMatch: true,
            priority: COMMAND_PRIORITY.TOP,
			appModes: [APP_MODE.INITIAL],
		});
		return [command];
    },
})
