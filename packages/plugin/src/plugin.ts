import type { ExecutableCommand } from "@getgrinta/core";
import type { PluginContext, PluginInit, Plugin } from "./types";

export function createPlugin(init: PluginInit): Plugin {
	return (context: PluginContext) => ({
		async register() {
			await init.onRegister?.(context);
			return this;
		},
		async handleCommand(command: ExecutableCommand) {
			return (
				(await init.handleCommand?.(command, context)) ?? { matched: false }
			);
		},
		addAppModes: init.addAppModes,
		addSearchResults: init.addSearchResults,
	});
}
