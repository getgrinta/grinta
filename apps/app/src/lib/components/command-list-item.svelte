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
import { handleContextMenu } from "$lib/utils.svelte";
import { highlightText } from "$lib/utils.svelte";
import { match, P } from "ts-pattern";
import { _ } from "svelte-i18n";
import type { z } from "zod";
import CommandListIcon from "./command-list-icon.svelte";
import { widgetsStore } from "$lib/store/widgets.svelte";
import { PressedKeys } from "runed";

const props = $props();

const pressedKeys = new PressedKeys();
const isCmdPressed = $derived(pressedKeys.has("Meta"));

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

const currentLabel = $derived(props.item.localizedLabel ?? props.item.label);

const highlightedText = $derived(
	highlightText(
		isCmdPressed ? (props.item.path ?? currentLabel) : currentLabel,
		appStore.query,
	),
);
</script>

<li
	class={clsx(
		"!w-[calc(100%-2rem)] mx-4 select-none",
		appStore.query.length > 0 && commandsStore.selectedIndex === 0 && props.item.smartMatch && "border-gradient",
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
			"flex justify-between gap-4 border-2 border-transparent hover:bg-primary/40",
			props.active && 'menu-active !bg-primary/20 text-primary-content !border-primary-content/50 shadow-none',
		)}
	>
		<button
			type="button"
			onclick={() => commandsStore.handleCommand(props.item)}
			data-testid={`command-list-item.${props.index}`}
			class="flex flex-1 h-full gap-4 py-[0.5rem] items-center cursor-pointer"
		>
			<CommandListIcon
				label={currentLabel}
				item={props.item}
				active={props.active}
			/>
			<div class="flex flex-col align-left">
				<h2
					class={clsx("flex-1 flex text-left font-semibold truncate max-w-[34rem]")}
				>
					{#each highlightedText as chunk}
						{@const last = chunk === highlightedText[highlightedText.length - 1]}
						<span class={clsx(chunk.highlight ? "text-base-content" : "text-primary-content", last && "truncate", props.active && "!text-primary-content")}>
							{chunk.text}
						</span>
					{/each}
				</h2>
			</div>
		</button>
		<div class="flex gap-1 items-center">
			<span class={clsx("badge badge-lg border-none bg-transparent border-primary-content/50 font-semibold", props.active && "badge-primary !text-primary-content !border-primary-content/50")}>
				{getCommandTypeLabel({
					value: props.item.value,
					handler: props.item.handler,
					metadata: props.item.metadata,
				})}
			</span>
			<button
				type="button"
				class={clsx(
					"btn btn-square btn-ghost btn-sm btn-primary !border-0 p-[1px]", props.active && "text-primary-content",
				)}
				onclick={() => appStore.setQuery(currentLabel)}
			>
				<ArrowDownLeftIcon size={16} />
			</button>
		</div>
	</div>
</li>
