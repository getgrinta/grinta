import { type AppInfo, type ExtInfo, loadAppInfo } from "../grinta-invoke";
import { findApps } from "../utils.svelte";
import { invoke } from "@tauri-apps/api/core";
import { COMMAND_HANDLER, type ExecutableCommand } from "./commands.svelte";
export class AppMetadataStore {
	appInfo = $state<Record<string, AppInfo>>({});
	extInfo = $state<Record<string, ExtInfo>>({});
	loading = $state<boolean>(false);
	initialized = $state<boolean>(false);

	async initializeIcons() {
		if (this.initialized || this.loading) return;

		this.loading = true;

		try {
			const resourcesPaths: string[] = [];
			const appNameMap: Record<string, string> = {};

			const apps = await findApps();

			for (const app of apps) {
				const appName = app.name.replace(".app", "");
				const resourcesPath = `${app.path}/Contents/Resources/`;

				resourcesPaths.push(resourcesPath);
				appNameMap[appName] = resourcesPath;
			}

			// Load app icons in batches to avoid overloading the system
			const batchSize = 50;
			for (let i = 0; i < resourcesPaths.length; i += batchSize) {
				const batch = resourcesPaths.slice(i, i + batchSize);

				try {
					const appInfo = await loadAppInfo(batch);
					this.appInfo = { ...this.appInfo, ...appInfo };
				} catch (error) {
					console.error(
						`Error loading icon batch ${i}-${i + batchSize}:`,
						error,
					);
				}
			}
		} catch (error) {
			console.error("Error initializing app icons:", error);
		} finally {
			this.loading = false;
			this.initialized = true;
		}

		invoke("load_extension_icons", {
			extensions: [
				"pdf",
				"jpg",
				"xlsx",
				"xls",
				"gdoc",
				"docx",
				"png",
				"md",
				"txt",
				"doc",
				"ppt",
				"pptx",
				"zip",
				"rar",
				"7z",
				"gsheet",
				"gslides",
				"drawio",
				"odp",
				"epub",
				"mobi",
				"djvu",
				"folder",
			],
		}).then((_icons) => {
			const icons = _icons as Record<string, string>;
			const data: Record<string, ExtInfo> = {};

			for (const [extension, base64Image] of Object.entries(icons)) {
				data[extension] = { base64Image, extension };
			}

			this.extInfo = { ...this.extInfo, ...data };
		});
	}

	getIcon(command: ExecutableCommand): string | null {
		if (command.handler === COMMAND_HANDLER.APP) {
			return this.appInfo[command.label]?.base64Image;
		}
		if (command.handler === COMMAND_HANDLER.FS_ITEM) {
			if (command.metadata?.contentType === "public.folder") {
				return this.extInfo["folder" as string]?.base64Image;
			}
			const extension = command.value.split(".").pop();
			return this.extInfo[extension as string]?.base64Image;
		}
		return null;
	}

	getExtensionIcon(extension: string): string | undefined {
		return this.extInfo[extension]?.base64Image;
	}

	getLocalizedName(appName: string): string | undefined {
		return this.appInfo[appName]?.localizedName;
	}
}

export const appMetadataStore = new AppMetadataStore();
