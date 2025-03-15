import { type AppInfo, loadAppInfo } from "$lib/grinta-invoke";
import { findApps } from "$lib/utils.svelte";
import { invoke } from "@tauri-apps/api/core";

export class AppMetadataStore {
	appInfo = $state<Record<string, AppInfo>>({});
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
	}

	getIcon(appName: string): string | undefined {
		return this.appInfo[appName]?.base64Image;
	}

	getLocalizedName(appName: string): string | undefined {
		return this.appInfo[appName]?.localizedName;
	}
}

export const appMetadataStore = new AppMetadataStore();
