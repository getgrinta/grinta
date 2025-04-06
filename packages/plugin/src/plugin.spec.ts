import { it, mock, expect } from "bun:test";
import { createPlugin } from "./plugin";
import type { ExecutableCommand } from "@getgrinta/core";

const MOCK_COMMAND: ExecutableCommand = {
	label: "TestCommand",
	value: "test",
	handler: "SYSTEM",
	localizedLabel: "TestCommand",
	metadata: {},
	appModes: [],
	smartMatch: false,
	priority: 0,
	historical: false,
};

function createContextMock() {
	const fetchMock = mock();
	const execMock = mock();
	return {
		fetch: fetchMock,
		exec: execMock,
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
	const searchResults = await plugin(contextMock).addSearchResults?.();
	expect(searchResults).toEqual([MOCK_COMMAND]);
	expect(addSearchResultsSpy).toHaveBeenCalled();
});
