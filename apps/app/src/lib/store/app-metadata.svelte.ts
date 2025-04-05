import { type AppInfo, type ExtInfo, loadAppInfo } from "../grinta-invoke";
import { invoke } from "@tauri-apps/api/core";
import { COMMAND_HANDLER, type ExecutableCommand } from "./commands.svelte";

export class AppMetadataStore {
	loadingState = $state<Record<string, boolean>>({});
	appInfo = $state<Record<string, AppInfo>>({});
	extInfo = $state<Record<string, ExtInfo>>({});
	loading = $state<boolean>(false);
	initialized = $state<boolean>(false);
	loadingApps = $state<Set<string>>(new Set());
	loadingExtensions = $state<Set<string>>(new Set());

	// Initialize the store with app paths but don't load icons yet
	async initialize() {
		if (this.initialized || this.loading) return;
		this.loading = true;

		this.loadExtensionIcon("folder");

		this.loading = false;
		this.initialized = true;
	}

	// Legacy method for backward compatibility
	async initializeIcons() {
		return this.initialize();
	}

	// Load an app icon on demand
	async loadAppIcon(
		appName: string,
		resourcePath: string,
	): Promise<string | null> {
		// Return cached icon if available
		if (this.appInfo[appName]?.base64Image) {
			return this.appInfo[appName].base64Image;
		}

		this.loadingApps.add(appName);

		try {
			loadAppInfo([`${resourcePath}`]).then((appInfo) => {
				// Update the store with the new icon
				// Only update keys with new values instead of creating a new object
				for (const [key, value] of Object.entries(appInfo)) {
					if (value) this.appInfo[key] = value;
				}
			});
			return null;
		} catch (error) {
			console.error(`Error loading icon for ${appName}:`, error);
			return null;
		} finally {
			this.loadingApps.delete(appName);
		}
	}

	// Load an extension icon on demand
	async loadExtensionIcon(extension: string): Promise<string | null> {
		// Return cached icon if available
		if (this.extInfo[extension]?.base64Image) {
			return this.extInfo[extension].base64Image;
		}

		// Skip if already loading
		if (this.loadingExtensions.has(extension)) {
			return null;
		}

		this.loadingExtensions.add(extension);

		try {
			const icons = (await invoke("load_extension_icons", {
				extensions: [extension],
			})) as Record<string, string>;

			const data: Record<string, ExtInfo> = {};
			for (const [ext, base64Image] of Object.entries(icons)) {
				data[ext] = { base64Image, extension: ext };
			}

			this.extInfo = { ...this.extInfo, ...data };
			return data[extension]?.base64Image || null;
		} catch (error) {
			console.error(`Error loading icon for extension ${extension}:`, error);
			return null;
		} finally {
			this.loadingExtensions.delete(extension);
		}
	}

	// Get an icon, loading it if necessary
	async getIconAsync(command: ExecutableCommand): Promise<string | null> {
		if (command.handler === COMMAND_HANDLER.APP) {
			if (this.loadingState[command.label]) return null;

			if (!command.path) return null;
			this.loadingState[command.label] = true;
			return this.loadAppIcon(command.label, command.path);
		}
		if (command.handler === COMMAND_HANDLER.FS_ITEM) {
			if (command.metadata?.contentType === "public.folder") {
				return this.loadExtensionIcon("folder");
			}
			const extension = command.value.split(".").pop();

			if (extension) {
				if (this.loadingState[extension]) return null;
				this.loadingState[extension] = true;
				return this.loadExtensionIcon(extension);
			}
		}
		return null;
	}

	// Synchronous version that returns cached icon or null
	getIcon(command: ExecutableCommand): string | null {
		if (command.handler === COMMAND_HANDLER.APP) {
			const icon = this.appInfo[command.label]?.base64Image;
			if (!icon && command.path) {
				// Trigger async load but don't wait for it
				this.loadAppIcon(command.label, command.path);
			}
			return icon || null;
		}
		if (command.handler === COMMAND_HANDLER.FS_ITEM) {
			if (command.metadata?.contentType === "public.folder") {
				const icon = this.extInfo["folder"]?.base64Image;
				if (!icon) {
					this.loadExtensionIcon("folder");
				}
				return icon || null;
			}
			const extension = command.value.split(".").pop();
			if (extension) {
				const icon = this.extInfo[extension]?.base64Image;
				if (!icon) {
					this.loadExtensionIcon(extension);
				}
				return icon || null;
			}
		}
		return null;
	}

	getExtensionIcon(extension: string): string | null {
		const icon = this.extInfo[extension]?.base64Image;
		if (!icon) {
			// Trigger async load but don't wait for it
			this.loadExtensionIcon(extension);
		}
		return icon || null;
	}

	getLocalizedName(appName: string): string | undefined {
		return this.appInfo[appName]?.localizedName;
	}
}

export const appMetadataStore = new AppMetadataStore();
