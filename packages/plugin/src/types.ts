import type { ExecutableCommand } from "@getgrinta/core";
import type { fetch } from "@tauri-apps/plugin-http";

export type PluginContext = {
	fetch: typeof fetch;
	exec: (command: ExecutableCommand) => Promise<void>;
};

export type PluginBase = {
	addAppModes?: () => Promise<string[]>;
	addSearchResults?: () => Promise<ExecutableCommand[]>;
};

export type PluginInit = PluginBase & {
	name: string;
	onRegister?: (context: PluginContext) => Promise<void>;
	handleCommand?: (
		command: ExecutableCommand,
		context: PluginContext,
	) => Promise<{ matched: boolean }>;
};

export type PluginInstance = PluginBase & {
	register: () => Promise<PluginInstance>;
	handleCommand: (command: ExecutableCommand) => Promise<{ matched: boolean }>;
};

export type Plugin = (context: PluginContext) => PluginInstance;
