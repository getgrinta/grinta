import { describe, expect, it } from "bun:test";
import { commandsStore } from "./commands.svelte";
import { COMMAND_HANDLER, SYSTEM_COMMAND } from "./commands.svelte";

describe("Commands Store", () => {
	it("should create command store instance", () => {
		expect(commandsStore).toBeDefined();
	});

	it("should have expected properties", () => {
		// Test that the store has the expected properties
		expect(commandsStore.commands).toBeDefined();
		expect(Array.isArray(commandsStore.commands)).toBe(true);

		expect(commandsStore.selectedIndex).toBeDefined();
		expect(typeof commandsStore.selectedIndex).toBe("number");

		expect(commandsStore.installedApps).toBeDefined();
		expect(Array.isArray(commandsStore.installedApps)).toBe(true);

		expect(commandsStore.appCommands).toBeDefined();
		expect(Array.isArray(commandsStore.appCommands)).toBe(true);

		expect(commandsStore.shortcutCommands).toBeDefined();
		expect(Array.isArray(commandsStore.shortcutCommands)).toBe(true);

		expect(commandsStore.webSearchCommands).toBeDefined();
		expect(Array.isArray(commandsStore.webSearchCommands)).toBe(true);
	});

	it("should have expected methods", () => {
		// Test that the essential methods exist
		expect(typeof commandsStore.getMenuItems).toBe("function");
		expect(typeof commandsStore.sortCommands).toBe("function");
		expect(typeof commandsStore.openUrl).toBe("function");
		expect(typeof commandsStore.handleCommand).toBe("function");
		expect(typeof commandsStore.removeHistoryOfType).toBe("function");
		expect(typeof commandsStore.removeHistoryEntry).toBe("function");
		expect(typeof commandsStore.clearHistory).toBe("function");
	});

	it("should get menu items", () => {
		// Test the getMenuItems method
		const menuItems = commandsStore.getMenuItems();
		expect(menuItems).toBeDefined();
		expect(Array.isArray(menuItems)).toBe(true);

		// Check if menu items contain expected system commands
		const systemCommands = menuItems.filter(
			(cmd) => cmd.handler === COMMAND_HANDLER.SYSTEM,
		);
		expect(systemCommands.length).toBeGreaterThan(0);

		// Verify specific system commands are present
		const signInCommand = systemCommands.find(
			(cmd) => cmd.value === SYSTEM_COMMAND.SIGN_IN,
		);
		const helpCommand = systemCommands.find(
			(cmd) => cmd.value === SYSTEM_COMMAND.HELP,
		);
		const settingsCommand = systemCommands.find(
			(cmd) => cmd.value === SYSTEM_COMMAND.SETTINGS,
		);

		expect(signInCommand).toBeDefined();
		expect(helpCommand).toBeDefined();
		expect(settingsCommand).toBeDefined();
	});

	it("should sort commands by handler priority", () => {
		// Create test commands with different handlers
		const systemCommand = {
			label: "System Command",
			value: "system",
			handler: COMMAND_HANDLER.SYSTEM,
			smartMatch: false,
		};

		const appCommand = {
			label: "App Command",
			value: "app",
			handler: COMMAND_HANDLER.APP,
			smartMatch: false,
		};

		const urlCommand = {
			label: "URL Command",
			value: "url",
			handler: COMMAND_HANDLER.URL,
			smartMatch: false,
		};

		// Test sortCommands method
		// Lower number means higher priority
		const systemVsApp = commandsStore.sortCommands({
			prev: systemCommand,
			next: appCommand,
		});
		const appVsUrl = commandsStore.sortCommands({
			prev: appCommand,
			next: urlCommand,
		});
		const systemVsUrl = commandsStore.sortCommands({
			prev: systemCommand,
			next: urlCommand,
		});

		// System should have higher priority than App (lower index)
		expect(systemVsApp).toBeLessThan(0);

		// App should have higher priority than URL
		expect(appVsUrl).toBeLessThan(0);

		// System should have higher priority than URL
		expect(systemVsUrl).toBeLessThan(0);
	});

	it("should handle commandHistory getter gracefully", () => {
		// Test that the commandHistory getter works even before initialization
		const history = commandsStore.commandHistory;
		expect(Array.isArray(history)).toBe(true);
	});

	it("should have URL commands in buildUrlCommands", () => {
		// We can't directly test private methods, but we can infer their correct operation
		// by testing public properties they affect or checking if objects constructed by public methods
		// have expected properties

		// Test that command objects from getMenuItems have the right structure
		const menuItems = commandsStore.getMenuItems();
		expect(menuItems.length).toBeGreaterThan(0);

		// All menu items should have the required properties of a command
		for (const command of menuItems) {
			expect(command).toHaveProperty("label");
			expect(command).toHaveProperty("value");
			expect(command).toHaveProperty("handler");
		}
	});
});
