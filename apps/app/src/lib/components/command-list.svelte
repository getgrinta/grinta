<script lang="ts">
import { BAR_MODE, appStore } from "$lib/store/app.svelte";
import {
	COMMAND_HANDLER,
	type CommandHandler,
	commandsStore,
} from "$lib/store/commands.svelte";
import {
	AppWindowIcon,
	ChevronRightIcon,
	EqualIcon,
	GlobeIcon,
	SparklesIcon,
	StickyNoteIcon,
} from "lucide-svelte";
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

$effect(() => {
	const firstSelected = commandsStore.selectedIndex === 0;
	const lastSelected =
		commandsStore.selectedIndex === commandsStore.commands.length - 1;
	if (firstSelected) {
		return window.scrollTo({
			top: 0,
		});
	}
	if (lastSelected) {
		return window.scrollTo({
			top: document.body.scrollHeight,
		});
	}
	return window.scrollTo({
		top: (commandsStore.selectedIndex + 1) * 51 - 52,
	});
});
</script>

<div class="flex flex-1 flex-col mt-[4.25rem] overflow-hidden">
  <ul
  	id="commandList"
    class="menu menu-lg flex-1 menu-vertical flex-nowrap p-0 w-full"
  >
    {#each commandsStore.commands as command, index (index)}
    	{@const active = commandsStore.selectedIndex === index}
    	{@const labelChunks = highlightText(command.label, appStore.query)}
		{@const IconComponent = getIcon(command.handler)}
      <li class="w-full" data-command-index={index} transition:fly={{ duration: 150, y: -5, delay: index * 20, easing: circOut }}>
          <div class={clsx("flex justify-between gap-4 py-[0.75rem] px-6 border-1 border-transparent text-neutral-300", active && 'menu-active !bg-base-100/40 !text-primary !border-neutral-600')}>
            <button type="button" onclick={() => commandsStore.handleCommand(index)} class="flex flex-1 h-full gap-4 items-center overflow-hidden cursor-pointer">
              <IconComponent size={24} />
              <h2 class={clsx("flex-1 text-left truncate")}>
              	{#if appStore.query.length > 0}
	              	{#each labelChunks as chunk}
		              	<span class={clsx(chunk.highlight ? "text-neutral-300" : "text-primary font-semibold")}>{chunk.text}</span>
		              {/each}
	              {:else}
					<span>{command.label}</span>
	              {/if}
			  </h2>
            </button>
            <div class="flex gap-1 items-center">
	            <span class={clsx("badge", active ? "badge-outline !text-primary !border-primary" : "badge-soft text-neutral-300")}>{getHelperText({ value: command.value, handler: command.handler })}</span>
            	<button type="button" class="btn btn-square btn-ghost btn-sm" onclick={() => appStore.setQuery(command.label)}>
            		<ArrowDownLeftIcon size={16} />
          		</button>
            </div>
		</div>
      </li>
    {/each}
  </ul>
</div>
