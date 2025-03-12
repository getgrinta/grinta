<script lang="ts">
import { appMetadataStore } from "$lib/store/app-metadata.svelte";
import { BAR_MODE, appStore } from "$lib/store/app.svelte";
import {
	COMMAND_HANDLER,
	type CommandHandler,
	type ExecutableCommand,
	commandsStore,
} from "$lib/store/commands.svelte";
import { THEME } from "$lib/store/settings.svelte";
import { widgetsStore } from "$lib/store/widgets.svelte";
import { SystemThemeWatcher } from "$lib/system-theme-watcher.svelte";
import {
	clickListener,
	getIcon,
	handleContextMenu,
	highlightText,
} from "$lib/utils.svelte";
import { clsx } from "clsx";
import { ArrowDownLeftIcon, PinIcon } from "lucide-svelte";
import { _ } from "svelte-i18n";
import VirtualList from "svelte-tiny-virtual-list";
import { fade } from "svelte/transition";
import { P, match } from "ts-pattern";
import ContextMenu, { type MenuItem } from "./context-menu.svelte";
const contextMenuItems: MenuItem[] = [
	{
		label: "Pin",
		icon: PinIcon as any,
		onClick: (context) =>
			widgetsStore.addWidget({
				type: "command",
				data: context as ExecutableCommand,
			}),
	},
];

type GetHelperProps = {
	value: string;
	handler: CommandHandler;
};

function getHelperText({ value, handler }: GetHelperProps) {
	return match(handler)
		.with(COMMAND_HANDLER.APP, () => $_("commands.helperText.app"))
		.with(COMMAND_HANDLER.URL, () => $_("commands.helperText.web"))
		.with(COMMAND_HANDLER.SYSTEM, () => $_("commands.helperText.barCommand"))
		.with(COMMAND_HANDLER.CHANGE_MODE, () =>
			$_("commands.helperText.changeMode"),
		)
		.with(
			P.union(
				COMMAND_HANDLER.COPY_TO_CLIPBOARD,
				COMMAND_HANDLER.FORMULA_RESULT,
			),
			() => $_("commands.helperText.copyToClipboard"),
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

const itemCount = $derived(commandsStore.commands.length);
const scrollToIndex = $derived(
	itemCount > 0 ? commandsStore.selectedIndex : undefined,
);

const systemThemeWatcher = new SystemThemeWatcher();

// Hide context menu when clicking outside
$effect(clickListener);
</script>

<ContextMenu name="commandList" items={contextMenuItems} />

<ul
	id="commandList"
	class="menu menu-lg flex-1 menu-vertical flex-nowrap overflow-hidden w-full p-0"
>
<VirtualList scrollToIndex={scrollToIndex} width="100%" height={396} {itemCount} itemSize={65}>
	<li 
		let:index 
		class={clsx("!w-[calc(100%-2rem)] mx-4 select-none", commandsStore.commands[index].smartMatch && "border-gradient")} 
		data-command-index={index} 
		slot="item" 
		let:style 
		transition:fade={{ duration: 150 }} 
		oncontextmenu={(event) => handleContextMenu({ event, name: "commandList", context: commandsStore.commands[index] })}
		{style}
	>
		{@const active = commandsStore.selectedIndex === index}
		{@const IconComponent = getIcon(commandsStore.commands[index].handler)}
		{@const command = commandsStore.commands[index]}
		{@const currentLabel = command.localizedLabel ?? command.label}
		{@const labelChunks = highlightText(currentLabel, appStore.query)}

		{@const rowCss = systemThemeWatcher.theme === THEME.LIGHT ? "border-1 border-transparent hover:bg-neutral-300/30 color-base-100" : "border-1 border-transparent color-base-100"}
		{@const rowActiveCss = systemThemeWatcher.theme === THEME.DARK ? 'menu-active !bg-base-100/40 !text-primary !border-neutral-600' : 'menu-active !bg-neutral-300/30 color-base-10 border-1 !border-neutral-400/30'}

		{@const labelChunkCss = (isHiglighted: boolean) => systemThemeWatcher.theme === THEME.DARK ? (isHiglighted ? "text-neutral-300" : "text-primary font-semibold") : (isHiglighted ? "color-base-100 text-neutral-800" : "color-base-100 text-neutral-800 font-semibold")}
		{@const badgeCss = (isHiglighted: boolean) => systemThemeWatcher.theme === THEME.DARK ? (isHiglighted ? "badge-outline !text-primary !border-primary" : "badge-soft text-neutral-300") : (isHiglighted ? "badge-outline !text-primary !border-primary" : " !bg-neutral-300/50 border-0 badge-soft text-neutral-300")}
		
		{@const arrowDownLeftCss = systemThemeWatcher.theme === THEME.LIGHT && "text-neutral-600 hover:!bg-neutral-300/50"}

		<div 
			class={clsx("flex justify-between gap-4", rowCss, active && rowActiveCss)}
		>
			<button type="button" onclick={() => commandsStore.handleCommand(command)} class="flex flex-1 h-full gap-4 py-[0.75rem] items-center overflow-hidden cursor-pointer">
				{#if command.handler === COMMAND_HANDLER.APP}
					{@const icon = appMetadataStore.getIcon(command.label)}

					{#if icon}
						<img src={icon} alt={currentLabel} width="24" height="24" class="w-8 h-8 object-contain" />
					{:else}
						<IconComponent size={24} />
					{/if}
				{:else}
					<IconComponent size={24} />
				{/if} 
				<h2 class={clsx("flex-1 flex text-left truncate max-w-[34rem]")}>
					{#if appStore.query.length > 0}
						{#each labelChunks as chunk}
							<span class={clsx(labelChunkCss(chunk.highlight))}>{chunk.text}</span>
						{/each}
					{:else}
						<span class="flex-1 truncate">{currentLabel}</span>
					{/if}
				</h2>
			</button>
			<div class="flex gap-1 items-center">
				<span class={clsx("badge", badgeCss(active))}>
					{getHelperText({ value: command.value, handler: command.handler })}
				</span>
				<button type="button" class={clsx("btn btn-square btn-ghost btn-sm !border-0 p-[1px]", arrowDownLeftCss)} onclick={() => appStore.setQuery(currentLabel)}>
					<ArrowDownLeftIcon size={16} />
				</button>
			</div>
		</div>
	</li>
</VirtualList>
</ul>
