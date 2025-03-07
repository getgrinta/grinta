import { invoke } from "@tauri-apps/api/core";
import { readDir } from "@tauri-apps/plugin-fs";

type AppInfo = { base64Image: string; localizedName: string };

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

			// Process apps from multiple directories
			const appDirectories = [
				{ path: "/Applications", apps: await readDir("/Applications") },
				{
					path: "/System/Applications",
					apps: await readDir("/System/Applications"),
				},
			];

			// Process all app directories
			for (const { path, apps } of appDirectories) {
				for (const app of apps) {
					if (!app.name.endsWith(".app") || !app.isDirectory) continue;

					const appName = app.name.replace(".app", "");
					const resourcesPath = `${path}/${app.name}/Contents/Resources/`;

					resourcesPaths.push(resourcesPath);
					appNameMap[appName] = resourcesPath;
				}
			}

			// Load app icons in batches to avoid overloading the system
			const batchSize = 20;
			for (let i = 0; i < resourcesPaths.length; i += batchSize) {
				const batch = resourcesPaths.slice(i, i + batchSize);

				try {
					const appInfo = await invoke<Record<string, AppInfo>>(
						"load_app_icons",
						{
							resourcesPaths: batch,
						},
					);

					this.appInfo = { ...this.appInfo, ...appInfo };
				} catch (error) {
					console.error(
						`Error loading icon batch ${i}-${i + batchSize}:`,
						error,
					);
				}
			}

			console.log(this.appInfo);
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
