<script lang="ts">
	import {
		COMMAND_HANDLER,
		type ExecutableCommand,
	} from "$lib/store/commands.svelte";
	import { widgetsStore } from "$lib/store/widgets.svelte";
	import { Command } from "@tauri-apps/plugin-shell";
	import { CopyIcon, PinIcon } from "lucide-svelte";
	import { EyeIcon, FolderIcon, TextIcon } from "lucide-svelte";
	import { _ } from "svelte-i18n";
	import { get } from "svelte/store";
	import ContextMenu from "./context-menu.svelte";
	import type { MenuItem } from "./context-menu.svelte";

	let contextMenuItems = $state<MenuItem[]>([]);

	function t(key: string, params: Record<string, string> = {}) {
		try {
			const translationFn = get(_);
			return translationFn(key, { values: params });
		} catch {
			return key;
		}
	}

	export function createContextMenuItems(command: ExecutableCommand) {
		const menuItems: MenuItem[] = [
			{
				label: t("commands.contextMenu.pin"),
				icon: PinIcon as any,
				onClick: () =>
					widgetsStore.addWidget({
						type: "command",
						data: command,
					}),
			},
		];

		if (command.handler === COMMAND_HANDLER.APP) {
			menuItems.push({
				label: t("commands.contextMenu.open"),
				icon: FolderIcon as any,
				onClick: () => {
					const { path } = command;

					if (!path) {
						return;
					}

					let pathToOpen = path;
					const lastSlash = pathToOpen.lastIndexOf("/");
					if (
						lastSlash !== -1 &&
						command.metadata?.contentType !== "public.folder"
					) {
						pathToOpen = pathToOpen.substring(0, lastSlash);
					}

					Command.create("open", [pathToOpen]).execute();
				},
			});
		}

		if (
			command.handler === COMMAND_HANDLER.FS_ITEM ||
			command.handler === COMMAND_HANDLER.APP
		) {
			menuItems.push({
				label: t("commands.contextMenu.showInFinder"),
				icon: EyeIcon as any,
				onClick: () => {
					const { path } = command;

					if (!path) {
						return;
					}

					let pathToOpen = path;
					const lastSlash = pathToOpen.lastIndexOf("/");
					if (
						lastSlash !== -1 &&
						command.metadata?.contentType !== "public.folder"
					) {
						pathToOpen = pathToOpen.substring(0, lastSlash);
					}

					Command.create("open", [pathToOpen]).execute();
				},
			});

			menuItems.push({
				label: t("commands.contextMenu.quickLook"),
				icon: EyeIcon as any,
				onClick: () => {
					const { path } = command;

					if (!path) {
						return;
					}

					Command.create("qlmanage", ["-p", path]).execute();
				},
			});

			menuItems.push({
				label: t("commands.contextMenu.getInfo"),
				icon: TextIcon as any,
				onClick: () => {
					const { path } = command;

					if (!path) {
						return;
					}

					Command.create("osascript", [
						"-e",
						`tell application "Finder" to open information window of file (POSIX file "${path}")`,
					]).execute();
				},
			});

			if (command.localizedLabel || command.label) {
				menuItems.push({
					label: t("commands.contextMenu.copyName"),
					icon: CopyIcon as any,
					onClick: () => {
						const { label, localizedLabel } = command;

						const targetLabel = localizedLabel || label;
						if (!targetLabel) {
							return;
						}

						navigator.clipboard.writeText(targetLabel);
					},
				});
			}

			if (command.path) {
				menuItems.push({
					label: t("commands.contextMenu.copyPath"),
					icon: CopyIcon as any,
					onClick: () => {
						const { path } = command;

						if (!path) {
							return;
						}

						navigator.clipboard.writeText(path);
					},
				});
			}
		}
		contextMenuItems = menuItems;
	}
</script>

<ContextMenu name="commandList" items={contextMenuItems} />
