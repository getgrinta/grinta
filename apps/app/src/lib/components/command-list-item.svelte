<script lang="ts">
import { clsx } from "clsx";
import { ArrowDownLeftIcon } from "lucide-svelte";
import { appStore } from "$lib/store/app.svelte";
import {
	COMMAND_HANDLER,
	commandsStore,
	type FileMetadataSchema,
	type CommandHandler,
} from "$lib/store/commands.svelte";
import { appMetadataStore } from "$lib/store/app-metadata.svelte";
import { systemThemeWatcher } from "$lib/system-theme-watcher.svelte";
import { ColorModeValue, handleContextMenu } from "$lib/utils.svelte";
import { highlightText } from "$lib/utils.svelte";
import { match, P } from "ts-pattern";
import { _ } from "svelte-i18n";
import type { z } from "zod";
import CommandListIcon from "./command-list-icon.svelte";
import { widgetsStore } from "$lib/store/widgets.svelte";
import { PressedKeys } from "runed";

const props = $props();

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

const pressedKeys = new PressedKeys();
const isCmdPressed = $derived(pressedKeys.has("Meta"));

const currentLabel = $derived(props.item.localizedLabel ?? props.item.label);

const rowClass = new ColorModeValue(
	"border-1 border-transparent hover:bg-zinc-300/30 color-base-100",
	"border-1 border-transparent color-base-100",
);

const rowActiveCss = new ColorModeValue(
	"menu-active !bg-zinc-300/30 color-base-10 border-1 !border-zinc-400/30",
	"menu-active !bg-base-100/40 !text-primary !border-zinc-600",
);
const labelChunkClass = (isHiglighted: boolean) =>
	new ColorModeValue(
		isHiglighted
			? "color-base-100 text-zinc-800"
			: "color-base-100 text-zinc-800 font-semibold",
		isHiglighted ? "text-zinc-300" : "text-primary font-semibold",
	);

const badgeClass = (isHiglighted: boolean) =>
	new ColorModeValue(
		isHiglighted
			? "badge-outline !text-primary !border-primary"
			: "!bg-zinc-300/50 border-0 badge-soft text-zinc-300",
		isHiglighted
			? "badge-outline !text-primary !border-primary"
			: "badge-soft text-zinc-300",
	);

const arrowDownLeftClass = new ColorModeValue(
	"text-zinc-600 hover:!bg-zinc-300/50",
	"text-zinc-100",
);

const pathClass = new ColorModeValue("text-zinc-600", "text-zinc-100");
</script>

<li
	class={clsx(
		"!w-[calc(100%-2rem)] mx-4 select-none motion-preset-slide-up",
		appStore.query.length > 0 && props.item.smartMatch && "border-gradient",
	)}
	data-command-index={props.index}
	oncontextmenu={(event) => {
		const isWidget = widgetsStore.data.widgets?.some(
			(widget) => widget.data.value === props.item.value,
		);
		props.contextMenu?.createContextMenuItems(props.item, isWidget);
		handleContextMenu({ event, name: "commandList" });
	}}
>
	<div
		class={clsx(
			"flex justify-between gap-4",
			rowClass.value,
			props.active && rowActiveCss,
		)}
	>
		<button
			type="button"
			onclick={() => commandsStore.handleCommand(props.item)}
			data-testid={`command-list-item.${props.index}`}
			class="flex flex-1 h-full gap-4 py-[0.75rem] items-center overflow-hidden cursor-pointer"
		>
			<CommandListIcon
				label={currentLabel}
				{appMetadataStore}
				item={props.item}
			/>
			<div class="flex flex-col align-left">
				<h2
					class={clsx("flex-1 flex text-left truncate max-w-[34rem]")}
				>
					{#if appStore.query.length > 0}
						{#each highlightText(currentLabel, appStore.query) as chunk}
							<span class={clsx(labelChunkClass(chunk.highlight).value)}>
								{chunk.text}
							</span>
						{/each}
					{:else}
						<span class="flex-1 truncate">{currentLabel}</span>
					{/if}
				</h2>

				<div class={clsx("text-xs text-left", pathClass.value, "text-xs")}>
					{#if isCmdPressed && props.item.path}
						{props.item.path}
					{/if}
				</div>
			</div>
		</button>
		<div class="flex gap-1 items-center">
			<span class={clsx("badge", badgeClass(props.active).value)}>
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
					arrowDownLeftClass.value,
				)}
				onclick={() => appStore.setQuery(currentLabel)}
			>
				<ArrowDownLeftIcon size={16} />
			</button>
		</div>
	</div>
</li>
