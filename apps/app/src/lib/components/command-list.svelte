<script lang="ts">
import { appIconsStore } from "$lib/store/app-icons.svelte";
import { BAR_MODE, appStore } from "$lib/store/app.svelte";
import {
	COMMAND_HANDLER,
	type CommandHandler,
	commandsStore,
} from "$lib/store/commands.svelte";
import { highlightText } from "$lib/utils.svelte";
import { clsx } from "clsx";
import {
	AppWindowIcon,
	ArrowDownLeftIcon,
	ChevronRightIcon,
	EqualIcon,
	GlobeIcon,
	SparklesIcon,
	StickyNoteIcon,
} from "lucide-svelte";
import { _ } from "svelte-i18n";
import VirtualList from "svelte-tiny-virtual-list";
import { fade } from "svelte/transition";
import { P, match } from "ts-pattern";

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
		.with(COMMAND_HANDLER.COMPLETE_NOTE, () =>
			$_("commands.helperText.createSmartNote"),
		)
		.with(COMMAND_HANDLER.RUN_SHORTCUT, () =>
			$_("commands.helperText.runShortcut"),
		)
		.otherwise(() => value);
}

function getIcon(handler: CommandHandler) {
	if (appStore.barMode !== BAR_MODE.INITIAL) return ChevronRightIcon;
	return match(handler)
		.with(COMMAND_HANDLER.URL, () => GlobeIcon)
		.with(COMMAND_HANDLER.APP, () => AppWindowIcon)
		.with(COMMAND_HANDLER.OPEN_NOTE, () => StickyNoteIcon)
		.with(COMMAND_HANDLER.CREATE_NOTE, () => StickyNoteIcon)
		.with(COMMAND_HANDLER.COMPLETE_NOTE, () => SparklesIcon)
		.with(COMMAND_HANDLER.FORMULA_RESULT, () => EqualIcon)
		.otherwise(() => ChevronRightIcon);
}

const itemCount = $derived(commandsStore.commands.length);
const scrollToIndex = $derived(
	itemCount > 0 ? commandsStore.selectedIndex : undefined,
);
</script>

<div class="flex flex-1 flex-col mt-[4.25rem] overflow-hidden">
  <ul
  	id="commandList"
    class="menu menu-lg flex-1 menu-vertical flex-nowrap p-0 w-full"
  >
	<VirtualList scrollToIndex={scrollToIndex} width="100%" height={290} {itemCount} itemSize={70}>
		<li let:index class="w-full" data-command-index={index} slot="item" let:style transition:fade={{ duration: 150 }} {style}>
			{#if true}
			{@const active = commandsStore.selectedIndex === index}
			{@const IconComponent = getIcon(commandsStore.commands[index].handler)}
			{@const labelChunks = highlightText(commandsStore.commands[index].label, appStore.query)}
			<div class={clsx("flex justify-between gap-4 border-1 border-transparent text-neutral-300", active && 'menu-active !bg-base-100/40 !text-primary !border-neutral-600')}>
				<button type="button" onclick={() => commandsStore.handleCommand(index)} class="flex flex-1 h-full gap-4 py-[0.75rem] items-center overflow-hidden cursor-pointer">
					{#if commandsStore.commands[index].handler === COMMAND_HANDLER.APP}
						{@const icon = appIconsStore.getIcon(commandsStore.commands[index].label)}
			
						{#if icon}
							<img src={icon} alt={commandsStore.commands[index].label} width="24" height="24" class="w-6 h-6 object-contain" />
						{:else}
							<IconComponent size={24} />
						{/if}
					{:else}
						<IconComponent size={24} />
					{/if}
					<h2 class={clsx("flex-1 text-left truncate")}>
						{#if appStore.query.length > 0}
							{#each labelChunks as chunk}
								<span class={clsx(chunk.highlight ? "text-neutral-300" : "text-primary font-semibold")}>{chunk.text}</span>
							{/each}
						{:else}
							<span>{commandsStore.commands[index].label}</span>
						{/if}
					</h2>
				</button>
				<div class="flex gap-1 items-center">
					<span class={clsx("badge", active ? "badge-outline !text-primary !border-primary" : "badge-soft text-neutral-300")}>{getHelperText({ value: commandsStore.commands[index].value, handler: commandsStore.commands[index].handler })}</span>
					<button type="button" class="btn btn-square btn-ghost btn-sm" onclick={() => appStore.setQuery(commandsStore.commands[index].label)}>
						<ArrowDownLeftIcon size={16} />
					</button>
				</div>
			</div>
			{/if}
		</li>
	</VirtualList>
  </ul>
</div>
