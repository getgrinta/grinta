<script lang="ts">
  import { marked, type Tokens } from "marked";
  import { CheckIcon, CopyIcon, FileIcon } from "lucide-svelte";
  import { Chat } from "@ai-sdk/svelte";
  import { toast } from "svelte-sonner";
  import clsx from "clsx";
  import { match } from "ts-pattern";

  let { messages, status } = $props<{
    messages: Chat["messages"];
    status: Chat["status"];
  }>();

  const loading = $derived(["streaming", "submitted"].includes(status));

  const renderer = {
    link({ href, title, text }: Tokens.Link): string {
      const localLink = href.startsWith(
        `${location.protocol}//${location.hostname}`,
      );

      // to avoid title="null"
      if (title === null) {
        return localLink
          ? `<a href="${href}">${text}</a>`
          : `<a target="_blank" rel="noreferrer noopener" href="${href}">${text}</a>`;
      }
      return localLink
        ? `<a href="${href}" title="${title}">${text}</a>`
        : `<a target="_blank" rel="noreferrer noopener" href="${href}" title="${title}">${text}</a>`;
    },
  };
  marked.use({ renderer });

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Unable to access clipboard");
    }
  }

  function getToolName(toolName: string) {
    return match(toolName)
      .with("clickElement", () => "Click Element")
      .with("getElements", () => "Get Elements")
      .with("fillElement", () => "Fill Element")
      .with("scrollToElement", () => "Scroll To Element")
      .with("getElement", () => "Get Element")
      .otherwise(() => toolName);
  }
</script>

<div class="flex flex-col flex-1 p-2 gap-2 pt-16 pb-32">
  {#each messages as message}
    {@const content = message.content.trim()}
    {@const htmlContent = marked(message.content)}
    {#if message.role === "user"}
      {#if message.experimental_attachments?.length > 0}
        <div class="flex flex-row justify-end gap-2">
          {#each message.experimental_attachments as attachment}
            <dialog id="gallery_modal" class="modal">
              <div class="modal-box p-0">
                {#if attachment.contentType === "image/jpeg"}
                  <img
                    src={attachment.url}
                    alt={attachment.name}
                    class="w-full h-full"
                  />
                {/if}
              </div>
              <form method="dialog" class="modal-backdrop">
                <button>close</button>
              </form>
            </dialog>
            <button
              onclick={() => {
                if (attachment.contentType !== "image/jpeg") return;
                document.getElementById("gallery_modal")?.showModal();
              }}
              class="avatar border border-base-300 rounded-lg cursor-pointer"
              title={attachment.name}
            >
              <div class="w-10 rounded-lg">
                {#if attachment.contentType === "image/jpeg"}
                  <img src={attachment.url} alt={attachment.name} />
                {/if}
                {#if attachment.contentType === "text/plain"}
                  <div class="w-full h-full flex items-center justify-center">
                    <FileIcon size={20} />
                  </div>
                {/if}
              </div>
            </button>
          {/each}
        </div>
      {/if}
      <div class="chat chat-end">
        <div class="chat-bubble prose prose-sm">{@html htmlContent}</div>
      </div>
    {:else if message.role === "assistant"}
      {#if message.parts?.length > 0}
        <ul class="flex flex-col gap-2">
          {#each message.parts as part}
            {@const isTool = part.type === "tool-invocation"}
            {#if isTool}
              {@const toolLoading =
                isTool &&
                ["partial-call", "call"].includes(part.toolInvocation.state)}
              <li
                class={clsx(
                  "badge badge-soft",
                  toolLoading ? "badge-primary" : "badge-accent",
                )}
              >
                {#if toolLoading}
                  <span class="loading loading-dots loading-sm"></span>
                {:else}
                  <CheckIcon size={16} />
                {/if}
                <span>{getToolName(part.toolInvocation.toolName)}</span>
              </li>
            {/if}
          {/each}
        </ul>
      {/if}
      {#if content.length > 0}
        <div class="prose prose-sm relative group pb-4">
          {@html htmlContent}
          <button
            class="btn btn-sm btn-square absolute bottom-0 right-0 hidden group-hover:flex"
            onclick={() => copyToClipboard(content)}
          >
            <CopyIcon size={16} />
          </button>
        </div>
      {/if}
    {/if}
  {/each}
  {#if loading}
    <div class="loading loading-ring"></div>
  {/if}
</div>
