<script lang="ts">
	import { clsx } from "clsx";
	import { ArrowDownLeftIcon } from "lucide-svelte";
	import { THEME } from "$lib/store/settings.svelte";
	import { appStore } from "$lib/store/app.svelte";
	import {
		COMMAND_HANDLER,
		commandsStore,
		FileMetadataSchema,
		type CommandHandler,
	} from "$lib/store/commands.svelte";
	import { appMetadataStore } from "$lib/store/app-metadata.svelte";
	import { SystemThemeWatcher } from "$lib/system-theme-watcher.svelte";
	import { handleContextMenu } from "$lib/utils.svelte";
	import { highlightText } from "$lib/utils.svelte";
	import { match, P } from "ts-pattern";
	import { _ } from "svelte-i18n";
	import { z } from "zod";
    import CommandListIcon from "./command-list-icon.svelte";
    import { widgetsStore } from "$lib/store/widgets.svelte";

	const props = $props();

	const systemThemeWatcher = new SystemThemeWatcher();

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
			.with(COMMAND_HANDLER.SYSTEM, () =>
				$_("commands.helperText.barCommand"),
			)
			.with(COMMAND_HANDLER.CHANGE_MODE, () =>
				$_("commands.helperText.changeMode"),
			)
			.with(P.union(COMMAND_HANDLER.COPY_TO_CLIPBOARD), () =>
				$_("commands.helperText.copyToClipboard"),
			)
			.with(COMMAND_HANDLER.OPEN_NOTE, () =>
				$_("commands.helperText.openNote"),
			)
			.with(COMMAND_HANDLER.CREATE_NOTE, () =>
				$_("commands.helperText.createNote"),
			)
			.with(COMMAND_HANDLER.RUN_SHORTCUT, () =>
				$_("commands.helperText.runShortcut"),
			)
			.otherwise(() => value);
	}

	const currentLabel = $derived(props.item.localizedLabel ?? props.item.label);

	const rowCss =
		systemThemeWatcher.theme === THEME.LIGHT
			? "border-1 border-transparent hover:bg-neutral-300/30 color-base-100"
			: "border-1 border-transparent color-base-100";

	const rowActiveCss =
		systemThemeWatcher.theme === THEME.DARK
			? "menu-active !bg-base-100/40 !text-primary !border-neutral-600"
			: "menu-active !bg-neutral-300/30 color-base-10 border-1 !border-neutral-400/30";

	const labelChunkCss = (isHiglighted: boolean) =>
		systemThemeWatcher.theme === THEME.DARK
			? isHiglighted
				? "text-neutral-300"
				: "text-primary font-semibold"
			: isHiglighted
				? "color-base-100 text-neutral-800"
				: "color-base-100 text-neutral-800 font-semibold";

	const badgeCss = (isHiglighted: boolean) =>
		systemThemeWatcher.theme === THEME.DARK
			? isHiglighted
				? "badge-outline !text-primary !border-primary"
				: "badge-soft text-neutral-300"
			: isHiglighted
				? "badge-outline !text-primary !border-primary"
				: " !bg-neutral-300/50 border-0 badge-soft text-neutral-300";

	const arrowDownLeftCss =
		systemThemeWatcher.theme === THEME.LIGHT &&
		"text-neutral-600 hover:!bg-neutral-300/50";
</script>

<li
	class={clsx(
		"!w-[calc(100%-2rem)] mx-4 select-none motion-preset-slide-up",
		appStore.query.length > 0 && props.item.smartMatch && "border-gradient",
	)}
	data-command-index={props.index}
	oncontextmenu={(event) => {
		const isWidget = widgetsStore.data.widgets?.some(widget => widget.data.value === props.item.value);
		props.contextMenu?.createContextMenuItems(props.item, isWidget);
		handleContextMenu({ event, name: "commandList" });
	}}
>
	<div
		class={clsx(
			"flex justify-between gap-4",
			rowCss,
			props.active && rowActiveCss,
		)}
	>
		<button
			type="button"
			onclick={() => commandsStore.handleCommand(props.item)}
			data-testid={`command-list-item.${props.index}`}
			class="flex flex-1 h-full gap-4 py-[0.75rem] items-center overflow-hidden cursor-pointer"
		>
			<CommandListIcon label={currentLabel} appMetadataStore={appMetadataStore} item={props.item} />
			<div class="flex flex-col">
				<h2
					class={clsx("flex-1 flex text-left truncate max-w-[34rem]")}
				>
					{#if appStore.query.length > 0}
						{#each highlightText(currentLabel, appStore.query) as chunk}
							<span class={clsx(labelChunkCss(chunk.highlight))}>
								{chunk.text}
							</span>
						{/each}
					{:else}
						<span class="flex-1 truncate">{currentLabel}</span>
					{/if}
				</h2>
			</div>
		</button>
		<div class="flex gap-1 items-center">
			<span class={clsx("badge", badgeCss(props.active))}>
				{getCommandTypeLabel({
					value: props.item.value,
					handler: props.item.handler,
					metadata: props.item.metadata,
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
