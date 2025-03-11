<script lang="ts">
import { THEME } from "$lib/store/settings.svelte";
import { SystemThemeWatcher } from "$lib/utils.svelte";
import clsx from "clsx";
import { ChevronLeftIcon } from "lucide-svelte";
import SearchBarAccessoryButton from "./search-bar-accessory-button.svelte";

const { goBack, fancyMode = false } = $props<{
	goBack?: () => void;
	fancyMode?: boolean;
}>();

function defaultGoBack() {
	return window.history.back();
}

function scrollUp() {
	return window.scrollBy(0, -160);
}

function scrollDown() {
	return window.scrollBy(0, 160);
}

const systemThemeWatcher = new SystemThemeWatcher();
const topBarCss = $derived(
	systemThemeWatcher.theme === THEME.DARK
		? "backdrop-blur-lg bg-base-100 base-nonsemantic-dark border-neutral-800 !outline-none px-6 h-14"
		: "bg-neutral-300/50 border-neutral-400/30 !shadow-neutral-300/30 !shadow-xs !outline-none px-6 h-14",
);
</script>

<button type="button" onclick={scrollUp} class="hidden" data-hotkey="k">Scroll Up</button>
<button type="button" onclick={scrollDown} class="hidden" data-hotkey="j">Scroll Down</button>

<div class="fixed flex flex-row left-4 top-4 right-4 z-10 items-center gap-2">

  <label class={clsx("input flex-1 flex items-center gap-4 w-full", topBarCss, fancyMode && "border-gradient")}>
  	<slot name="indicator">
	    <SearchBarAccessoryButton class="text-primary" onclick={goBack ?? defaultGoBack} hotkey="Escape,h">
	      <ChevronLeftIcon size={16} />
	    </SearchBarAccessoryButton>
    </slot>
    <slot name="input"></slot>
    <slot name="addon"></slot>
  </label>
</div>
