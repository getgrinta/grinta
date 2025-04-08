import { it, mock, expect } from "bun:test";
import { createPlugin } from "./plugin";
import { APP_MODE, COMMAND_HANDLER, ExecutableCommandSchema, SettingsSchema, type ExecutableCommand } from "@getgrinta/core";
import { PluginContext } from "./types";

const MOCK_COMMAND: ExecutableCommand = ExecutableCommandSchema.parse({
	label: "TestCommand",
	value: "test",
	handler: COMMAND_HANDLER.SYSTEM,
	localizedLabel: "TestCommand",
	appModes: [APP_MODE.INITIAL],
});

function createContextMock(): PluginContext {
	const fetchMock = mock();
	const execMock = mock();
    const tMock = mock();
    const failMock = mock()
	return {
		fetch: fetchMock,
		exec: execMock,
		t: tMock,
        fail: failMock,
		app: {
            query: "",
            appMode: APP_MODE.INITIAL,
        },
		settings: SettingsSchema.parse({}),
		notes: [],
	};
}

it("registers an instance of Plugin", async () => {
	const registerSpy = mock();
	const contextMock = createContextMock();
	const plugin = createPlugin({
		name: "TestPlugin",
		onRegister: () => registerSpy("registered"),
	});
	await plugin(contextMock).register();
	expect(registerSpy).toHaveBeenCalledWith("registered");
});

it("handles a command", async () => {
	const handleCommandSpy = mock(() => Promise.resolve({ matched: true }));
	const contextMock = createContextMock();
	const plugin = createPlugin({
		name: "TestPlugin",
		handleCommand: handleCommandSpy,
	});
	const { matched } = await plugin(contextMock).handleCommand(MOCK_COMMAND);
	expect(matched).toBe(true);
	expect(handleCommandSpy).toHaveBeenCalled();
});

it("adds app modes", async () => {
	const addAppModesSpy = mock(() => Promise.resolve(["mode1", "mode2"]));
	const contextMock = createContextMock();
	const plugin = createPlugin({
		name: "TestPlugin",
		addAppModes: addAppModesSpy,
	});
	const appModes = await plugin(contextMock).addAppModes?.();
	expect(appModes).toEqual(["mode1", "mode2"]);
	expect(addAppModesSpy).toHaveBeenCalled();
});

it("adds search results", async () => {
	const addSearchResultsSpy = mock(() => Promise.resolve([MOCK_COMMAND]));
	const contextMock = createContextMock();
	const plugin = createPlugin({
		name: "TestPlugin",
		addSearchResults: addSearchResultsSpy,
	});
	const searchResults = await plugin(contextMock).addSearchResults?.("test");
	expect(searchResults).toEqual([MOCK_COMMAND]);
	expect(addSearchResultsSpy).toHaveBeenCalled();
});
