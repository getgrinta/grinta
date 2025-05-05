<script lang="ts">
  import AttachmentPicker from "$lib/components/attachment-picker.svelte";
  import { GetContentSchema } from "$lib/schema";
  import type { PageContext } from "$lib/types";
  import type { Chat } from "@ai-sdk/svelte";
  import {
    FileIcon,
    XIcon,
    CornerDownLeftIcon,
    PaperclipIcon,
  } from "lucide-svelte";
  import { sendMessage } from "webext-bridge/popup";
  import { ElementSize } from "runed";

  let contextMenuOpen = $state(false);
  let textareaElement = $state<HTMLElement>();

  let { handleSubmit, chat, pageContexts, attachPage, removePageContext } =
    $props<{
      handleSubmit: (event: SubmitEvent) => void;
      chat: Chat;
      pageContexts: PageContext[];
      attachPage: (pageContext: PageContext) => void;
      removePageContext: (index: number) => void;
    }>();

  const textareaSize = new ElementSize(() => textareaElement);

  async function fetchTab(tabId: number) {
    const response = await sendMessage(
      "grinta_fetchPage",
      { tabId },
      "background",
    );
    const pageContext = GetContentSchema.parse(response);
    attachPage(pageContext);
  }

  function handleKeyDown(event: KeyboardEvent) {
    event.stopPropagation();
    if (event.key === "Enter" && event.metaKey) {
      event.preventDefault();
      return handleSubmit();
    }
    if (event.key === "/" && event.metaKey) {
      contextMenuOpen = true;
      return;
    }
  }

  function getContextMenuOpen() {
    return contextMenuOpen;
  }

  function setContextMenuOpen(newOpen: boolean, force?: boolean) {
    if (newOpen && !force) return;
    contextMenuOpen = newOpen;
  }
</script>

<form onsubmit={handleSubmit} class="flex flex-col items-end justify-center">
  <AttachmentPicker
    bind:open={getContextMenuOpen, setContextMenuOpen}
    menuWidth={textareaSize.width}
    {fetchTab}
  >
    <div class="relative w-full">
      <textarea
        bind:this={textareaElement}
        bind:value={chat.input}
        name="prompt"
        class="textarea resize-none h-12 w-full"
        onkeydown={handleKeyDown}
        placeholder="Ask anything or attach context (⌘/)"
      ></textarea>
      <div class="flex absolute right-2 top-2">
        <button type="submit" class="btn btn-sm btn-ghost btn-square">
          <CornerDownLeftIcon size={16} />
        </button>
      </div>
    </div>
  </AttachmentPicker>
  <div class="flex flex-1 w-full justify-between items-center gap-1">
    <div class="flex flex-1 gap-2 items-center">
      {#each pageContexts as attachment, i}
        <div
          class="tooltip tooltip-right"
          data-tip={attachment.title?.substring(0, 16)}
        >
          <button
            type="button"
            class="btn btn-sm btn-square btn-ghost group"
            onclick={() => removePageContext(i)}
          >
            <FileIcon size={16} class="flex group-hover:hidden" />
            <XIcon size={16} class="hidden group-hover:flex" />
          </button>
        </div>
      {/each}
    </div>
    <div class="tooltip tooltip-left" data-tip="Attach context">
      <button
        type="button"
        class="btn btn-sm btn-ghost btn-square"
        onclick={() => setContextMenuOpen(true, true)}
      >
        <PaperclipIcon size={16} />
      </button>
    </div>
  </div>
</form>
