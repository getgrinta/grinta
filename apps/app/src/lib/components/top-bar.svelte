<script lang="ts">
import clsx from "clsx";
import { ChevronLeftIcon } from "lucide-svelte";
import SearchBarAccessoryButton from "./search-bar-accessory-button.svelte";
import { ColorModeValue } from "$lib/utils.svelte";

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

const topBarCss = new ColorModeValue(
	"border-zinc-400/30 !shadow-zinc-300/30 !shadow-xs !outline-none px-6 h-14",
	"backdrop-blur-lg base-nonsemantic-dark border-zinc-800 !outline-none px-6 h-14",
);
</script>

<button type="button" onclick={scrollUp} class="hidden" data-hotkey="k"
	>Scroll Up</button
>
<button type="button" onclick={scrollDown} class="hidden" data-hotkey="j"
	>Scroll Down</button
>

<div class="fixed flex flex-row left-4 top-4 right-4 z-10 items-center gap-2">
	<label
		class={clsx(
			"input flex-1 !bg-base-200 flex items-center gap-4 w-full",
			topBarCss.value,
			fancyMode ? "border-gradient" : "border-invisible",
		)}
	>
		<slot name="indicator">
			<SearchBarAccessoryButton
				className="text-primary"
				onClick={goBack ?? defaultGoBack}
				hotkey="Escape,h"
			>
				<ChevronLeftIcon size={16} />
			</SearchBarAccessoryButton>
		</slot>
		<slot name="input"></slot>
		<slot name="addon"></slot>
	</label>
</div>
