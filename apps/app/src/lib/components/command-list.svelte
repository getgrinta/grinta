<script lang="ts">
import { appMetadataStore } from "$lib/store/app-metadata.svelte";
import { appStore } from "$lib/store/app.svelte";
import {
	COMMAND_HANDLER,
	type CommandHandler,
	type ExecutableCommand,
	FileMetadataSchema,
	commandsStore,
} from "$lib/store/commands.svelte";
import { THEME } from "$lib/store/settings.svelte";
import { SystemThemeWatcher } from "$lib/system-theme-watcher.svelte";
import {
	clickListener,
	getIcon,
	handleContextMenu,
	highlightText,
} from "$lib/utils.svelte";
import { clsx } from "clsx";
import { ArrowDownLeftIcon } from "lucide-svelte";
import { _ } from "svelte-i18n";
import { P, match } from "ts-pattern";
import { VList } from "virtua/svelte";
import { z } from "zod";
import CommandListContextMenu from "./command-list-context-menu.svelte";

let contextMenu = $state<CommandListContextMenu>();

type GetHelperProps = {
	value: string;
	handler: CommandHandler;
	metadata?: z.infer<typeof FileMetadataSchema>;
};

function getCommandTypeLabel({ value, handler, metadata }: GetHelperProps) {
	return match(handler)
		.with(COMMAND_HANDLER.APP, () => $_("commands.helperText.app"))
		.with(COMMAND_HANDLER.FS_ITEM, () => {
			if (metadata?.contentType === "public.folder") {
				return $_("commands.helperText.folder");
			}
			return $_("commands.helperText.file");
		})
		.with(COMMAND_HANDLER.URL, () => $_("commands.helperText.web"))
		.with(COMMAND_HANDLER.SYSTEM, () => $_("commands.helperText.barCommand"))
		.with(COMMAND_HANDLER.CHANGE_MODE, () =>
			$_("commands.helperText.changeMode"),
		)
		.with(P.union(COMMAND_HANDLER.COPY_TO_CLIPBOARD), () =>
			$_("commands.helperText.copyToClipboard"),
		)
		.with(COMMAND_HANDLER.OPEN_NOTE, () => $_("commands.helperText.openNote"))
		.with(COMMAND_HANDLER.CREATE_NOTE, () =>
			$_("commands.helperText.createNote"),
		)
		.with(COMMAND_HANDLER.RUN_SHORTCUT, () =>
			$_("commands.helperText.runShortcut"),
		)
		.otherwise(() => value);
}

const systemThemeWatcher = new SystemThemeWatcher();

// Hide context menu when clicking outside
$effect(clickListener);
</script>

<CommandListContextMenu bind:this={contextMenu} />

<ul
	id="commandList"
	class="menu menu-lg flex-1 menu-vertical flex-nowrap overflow-hidden w-full p-0"
>
	<VList
		data={commandsStore.commands}
		style="height: 99vh;padding-top: var(--commands-padding);padding-bottom:1rem;"
		getKey={(_, i) => i}
	>
		{#snippet children(item: ExecutableCommand, index)}
			{@const active = commandsStore.selectedIndex === index}
			{@const IconComponent = getIcon(item)}
			{@const currentLabel = item.localizedLabel ?? item.label}
			{@const labelChunks = highlightText(currentLabel, appStore.query)}
			{@const rowCss =
				systemThemeWatcher.theme === THEME.LIGHT
					? "border-1 border-transparent hover:bg-neutral-300/30 color-base-100"
					: "border-1 border-transparent color-base-100"}
			{@const rowActiveCss =
				systemThemeWatcher.theme === THEME.DARK
					? "menu-active !bg-base-100/40 !text-primary !border-neutral-600"
					: "menu-active !bg-neutral-300/30 color-base-10 border-1 !border-neutral-400/30"}
			{@const labelChunkCss = (isHiglighted: boolean) =>
				systemThemeWatcher.theme === THEME.DARK
					? isHiglighted
						? "text-neutral-300"
						: "text-primary font-semibold"
					: isHiglighted
						? "color-base-100 text-neutral-800"
						: "color-base-100 text-neutral-800 font-semibold"}
			{@const badgeCss = (isHiglighted: boolean) =>
				systemThemeWatcher.theme === THEME.DARK
					? isHiglighted
						? "badge-outline !text-primary !border-primary"
						: "badge-soft text-neutral-300"
					: isHiglighted
						? "badge-outline !text-primary !border-primary"
						: " !bg-neutral-300/50 border-0 badge-soft text-neutral-300"}
			{@const arrowDownLeftCss =
				systemThemeWatcher.theme === THEME.LIGHT &&
				"text-neutral-600 hover:!bg-neutral-300/50"}
			{@const icon =
				item.handler === COMMAND_HANDLER.APP
					? appMetadataStore.getIcon(item.label)
					: null}
			<li
				class={clsx(
					"!w-[calc(100%-2rem)] mx-4 select-none motion-preset-slide-up",
					appStore.query.length > 0 &&
						item.smartMatch &&
						"border-gradient",
				)}
				data-command-index={index}
				oncontextmenu={(event) => {
					contextMenu?.createContextMenuItems(item);
					handleContextMenu({ event, name: "commandList" })
				}}
			>
				<div
					class={clsx(
						"flex justify-between gap-4",
						rowCss,
						active && rowActiveCss,
					)}
				>
					<button
						type="button"
						onclick={() => commandsStore.handleCommand(item)}
						data-testid={`command-list-item.${index}`}
						class="flex flex-1 h-full gap-4 py-[0.75rem] items-center overflow-hidden cursor-pointer"
					>
						{#if icon}
							<img
								src={icon}
								alt={currentLabel}
								width="32"
								height="32"
								class="w-8 h-8 object-contain"
							/>
						{:else}
							<div
								class="flex items-center justify-center w-8 h-8"
							>
								<IconComponent size={24} />
							</div>
						{/if}
						<div class="flex flex-col">
							<h2
								class={clsx(
									"flex-1 flex text-left truncate max-w-[34rem]",
								)}
							>
								{#if appStore.query.length > 0}
									{#each labelChunks as chunk}
										<span
											class={clsx(
												labelChunkCss(chunk.highlight),
											)}>{chunk.text}</span
										>
									{/each}
								{:else}
									<span class="flex-1 truncate"
										>{currentLabel}</span
									>
								{/if}
							</h2>
						</div>
					</button>
					<div class="flex gap-1 items-center">
						<span class={clsx("badge", badgeCss(active))}>
							{getCommandTypeLabel({
								value: item.value,
								handler: item.handler,
							})}
						</span>
						<button
							type="button"
							class={clsx(
								"btn btn-square btn-ghost btn-sm !border-0 p-[1px]",
								arrowDownLeftCss,
							)}
							onclick={() => appStore.setQuery(currentLabel)}
						>
							<ArrowDownLeftIcon size={16} />
						</button>
					</div>
				</div>
			</li>
		{/snippet}
	</VList>
</ul>
