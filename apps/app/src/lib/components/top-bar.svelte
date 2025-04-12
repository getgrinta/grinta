<script lang="ts">
  import { ChevronLeftIcon } from "lucide-svelte";

  const { goBack } = $props<{
    goBack?: () => void;
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
</script>

<div class="fixed flex flex-row left-0 top-0 right-0 z-20 items-center gap-2">
  <label
    for="nothing"
    class="input px-6 h-14 !outline-none bg-base-100/80 border-b backdrop-blur border-x-transparent border-t-transparent border-base-300 !shadow-none rounded-none flex-1 flex items-center gap-4 w-full"
  >
    <slot name="indicator">
      <button
        type="button"
        class="btn btn-sm"
        onclick={goBack ?? defaultGoBack}
      >
        <ChevronLeftIcon size={16} />
      </button>
    </slot>
    <slot name="input"></slot>
    <slot name="addon"></slot>
  </label>
</div>
