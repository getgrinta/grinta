<script lang="ts">
import { BAR_MODE, appStore } from "$lib/store/app.svelte";
import {
	COMMAND_HANDLER,
	type CommandHandler,
	commandsStore,
} from "$lib/store/commands.svelte";
import { clsx } from "clsx";
import {
	AppWindowIcon,
	ChevronRightIcon,
	GlobeIcon,
	SparklesIcon,
	StickyNoteIcon,
} from "lucide-svelte";
import { circOut } from "svelte/easing";
import { fly } from "svelte/transition";
import { match } from "ts-pattern";

type GetHelperProps = {
	value: string;
	handler: CommandHandler;
};

function getHelperText({ value, handler }: GetHelperProps) {
	return match(handler)
		.with(COMMAND_HANDLER.APP, () => "App")
		.with(COMMAND_HANDLER.URL, () => "Web")
		.with(COMMAND_HANDLER.SYSTEM, () => "Bar Command")
		.with(COMMAND_HANDLER.CHANGE_MODE, () => "Change Mode")
		.with(COMMAND_HANDLER.COPY_TO_CLIPBOARD, () => "Copy to clipboard")
		.with(COMMAND_HANDLER.OPEN_NOTE, () => "Open Note")
		.with(COMMAND_HANDLER.CREATE_NOTE, () => "Create Note")
		.with(COMMAND_HANDLER.COMPLETE_NOTE, () => "Ask AI")
		.with(COMMAND_HANDLER.RUN_SHORTCUT, () => "Run Shortcut")
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
      <li class="w-full" data-command-index={index} transition:fly={{ duration: 150, y: -5, delay: index * 20, easing: circOut }}>
          <a onclick={() => commandsStore.handleCommand(index)} class={clsx("justify-between gap-4 py-[0.75rem] px-6 border-1 border-transparent text-neutral-300", active && 'menu-active !bg-base-100/40 !text-primary !border-neutral-600')}>
            <div class="flex gap-4 items-center overflow-hidden">
              <svelte:component this={getIcon(command.handler)} size={24} />
              <h2 class={clsx("flex-1 font-semibold truncate")}>{command.label}</h2>
            </div>
            <span class={clsx("badge", active ? "badge-outline !text-primary !border-primary" : "badge-soft text-neutral-300")}>{getHelperText({ value: command.value, handler: command.handler })}</span>
          </a>
      </li>
    {/each}
  </ul>
</div>

