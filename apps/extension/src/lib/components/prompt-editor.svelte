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
    SquareIcon,
    MicIcon,
    CheckIcon,
  } from "lucide-svelte";
  import { sendMessage } from "webext-bridge/popup";
  import { ElementSize } from "runed";
  import { createForm } from "felte";
  import { tabsStore } from "$lib/store/tabs.svelte";
  import { env } from "$lib/env";

  let recording = $state(false);
  let contextMenuOpen = $state(false);
  let textareaElement = $state<HTMLElement>();
  let actualTextareaElement = $state<HTMLElement>();

  let { handleSubmit, chat, pageContexts, attachPage, removePageContext } =
    $props<{
      handleSubmit: (event: SubmitEvent) => void;
      chat: Chat;
      pageContexts: PageContext[];
      attachPage: (pageContext: PageContext) => void;
      removePageContext: (index: number) => void;
    }>();

  const { form } = createForm({
    onSubmit: handleSubmit,
  });
  const urlTabs = $derived(
    tabsStore.tabs.filter((tab) => tab.url?.startsWith("http")),
  );
  const filteredTabs = $derived(
    pageContexts.length === 0
      ? urlTabs
      : urlTabs.filter((tab) =>
          pageContexts.some((pc: PageContext) => pc.url !== tab.url),
        ),
  );

  const textareaSize = new ElementSize(() => textareaElement);

  function dataURLtoBlob(dataURL: string) {
    const [header, base64] = dataURL.split(",");
    const mimeMatch = header.match(/data:(.*);base64/);
    const mimeType = mimeMatch ? mimeMatch[1] : "application/octet-stream";
    const binaryString = atob(base64);
    const byteNumbers = Array.from(binaryString, (char) => char.charCodeAt(0));
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

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
    if (event.key === "Enter" && !event.shiftKey) {
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

  function forceContextMenuOpen(event: MouseEvent) {
    event.stopPropagation();
    return setContextMenuOpen(true, true);
  }

  async function startRecording() {
    recording = true;
    const currentTab = (await sendMessage(
      "grinta_getCurrentTab",
      {},
      "background",
    )) as unknown as chrome.tabs.Tab;
    return sendMessage(
      "grinta_startRecording",
      { tabId: currentTab.id },
      "background",
    );
  }

  async function getRecording() {
    recording = false;
    const currentTab = (await sendMessage(
      "grinta_getCurrentTab",
      {},
      "background",
    )) as unknown as chrome.tabs.Tab;
    const voiceRecording = (await sendMessage(
      "grinta_stopRecording",
      { tabId: currentTab.id },
      "background",
    )) as { audio: string };
    const blob = dataURLtoBlob(voiceRecording.audio);
    const formData = new FormData();
    formData.append("speech", new File([blob], "speech.wav"));
    const transcriptionRequest = await fetch(
      env.VITE_API_URL + "/api/ai/speech",
      {
        method: "POST",
        body: formData,
      },
    );
    const transcription = await transcriptionRequest.json();
    if (chat.input.trim() !== "") chat.input += " ";
    chat.input += transcription.text;
    return actualTextareaElement?.focus();
  }

  async function abortRecording() {
    recording = false;
    const currentTab = (await sendMessage(
      "grinta_getCurrentTab",
      {},
      "background",
    )) as unknown as chrome.tabs.Tab;
    return sendMessage(
      "grinta_stopRecording",
      { tabId: currentTab.id },
      "background",
    );
  }
</script>

<form use:form class="flex flex-col items-end justify-center">
  <AttachmentPicker
    tabs={filteredTabs}
    bind:open={getContextMenuOpen, setContextMenuOpen}
    menuWidth={textareaSize.width}
    {fetchTab}
  >
    <div
      bind:this={textareaElement}
      class="relative flex flex-col textarea pb-10 w-full"
    >
      <textarea
        bind:value={chat.input}
        bind:this={actualTextareaElement}
        name="prompt"
        class="resize-none flex-1"
        onkeydown={handleKeyDown}
        placeholder={recording
          ? "Listening..."
          : "Ask anything or attach context (⌘/)"}
      ></textarea>
      <div class="flex items-center absolute bottom-2 left-2">
        <div class="tooltip tooltip-right" data-tip="Attach context">
          <button
            type="button"
            class="btn btn-sm btn-outline border-[var(--input-color)] btn-square"
            onclick={forceContextMenuOpen}
          >
            <PaperclipIcon size={16} />
          </button>
        </div>
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
      <div class="flex gap-1 absolute right-2 bottom-2">
        {#if recording}
          <button
            type="button"
            class="btn btn-sm btn-outline border-[var(--input-color)] btn-square"
            onclick={abortRecording}
          >
            <XIcon size={16} />
          </button>
          <button
            type="button"
            class="btn btn-sm btn-outline border-[var(--input-color)] btn-square"
            onclick={getRecording}
          >
            <CheckIcon size={16} />
          </button>
        {:else if chat.status === "ready"}
          <button
            type="button"
            class="btn btn-sm btn-outline border-[var(--input-color)] btn-square"
            onclick={startRecording}
          >
            <MicIcon size={16} />
          </button>
          <button type="submit" class="btn btn-sm btn-primary btn-square">
            <CornerDownLeftIcon size={16} />
          </button>
        {:else}
          <button
            type="button"
            class="btn btn-sm btn-accent btn-square"
            onclick={chat.stop}
          >
            <SquareIcon size={16} />
          </button>
        {/if}
      </div>
    </div>
  </AttachmentPicker>
</form>
