<script lang="ts">
import clsx from "clsx";
import { ChevronLeftIcon } from "lucide-svelte";

const { goBack, fancyMode = false } = $props<{ goBack?: () => void; fancyMode?: boolean }>();

function defaultGoBack() {
	return window.history.back();
}

function scrollUp() {
	return window.scrollBy(0, -160);
}

function scrollDown() {
	return window.scrollBy(0, 160);
}
</script>

<button type="button" onclick={scrollUp} class="hidden" data-hotkey="k">Scroll Up</button>
<button type="button" onclick={scrollDown} class="hidden" data-hotkey="j">Scroll Down</button>

<div class="fixed flex flex-row left-4 top-4 right-4 z-10 items-center gap-2">
  <label class={clsx("input flex-1 flex items-center gap-4 w-full backdrop-blur-lg bg-base-100/20 border-neutral-800 !outline-none px-6 h-14", fancyMode && "border-gradient")}>
  	<slot name="indicator">
	    <button type="button" onclick={goBack ?? defaultGoBack} class="btn btn-sm text-primary btn-square" data-hotkey="Escape,h">
	      <ChevronLeftIcon size={16} />
	    </button>
    </slot>
    <slot name="input"></slot>
    <slot name="addon"></slot>
  </label>
</div>
