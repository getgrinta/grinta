<script lang="ts">
  import { HistoryIcon, PlusIcon } from "lucide-svelte";
  import Layout from "$lib/components/layout.svelte";
  import { sendMessage } from "webext-bridge/popup";
  import { GetContentSchema } from "$lib/schema";
  import type { PageContext } from "$lib/types";
  import { useRsv } from "@ryuz/rsv";
  import { authClient } from "$lib/auth";
  import ViewTitle from "$lib/components/view-title.svelte";
  import { Chat } from "@ai-sdk/svelte";
  import { env } from "$lib/env";
  import { chatsStore } from "$lib/store/chats.svelte";
  import { pageContextToMessage } from "$lib/utils.svelte";
  import { onMount } from "svelte";
  import { marked } from "marked";
  import PromptEditor from "$lib/components/prompt-editor.svelte";
  import { XMLValidator, XMLParser } from "fast-xml-parser";

  const parser = new XMLParser({
    ignoreAttributes: false,
  });

  const router = useRsv();
  const chatId = $derived(router?.getParam("id"));
  let pageContexts = $state<PageContext[]>([]);
  const session = authClient.useSession();
  const user = $derived($session.data?.user);
  const chatUrl = $derived(env.VITE_API_URL + "/api/ai/stream");
  const chat = $derived(
    new Chat({
      api: chatUrl,
      sendExtraMessageFields: true,
      initialMessages:
        chatsStore.data.chats.find((chat) => chat.id === chatId)?.messages ??
        [],
      onFinish(message) {
        console.log(">>> onFinish", message);
      },
    }),
  );

  async function fetchTab(tabId: number) {
    const response = await sendMessage(
      "grinta_fetchPage",
      { tabId },
      "background",
    );
    const pageContext = GetContentSchema.parse(response);
    attachPage(pageContext);
  }

  function attachPage(pageContext: PageContext) {
    const alreadyAttached = pageContexts.some(
      (pageContext) => pageContext.url === pageContext.url,
    );
    if (alreadyAttached) return;
    pageContexts.push(pageContext);
  }

  function removePageContext(index: number) {
    pageContexts.splice(index, 1);
  }

  async function handleSubmit(event?: SubmitEvent) {
    if (!chatId) return;
    for (const [index, pageContext] of pageContexts.entries()) {
      await chat.append({
        role: "system",
        content: pageContextToMessage(pageContext),
      });
      removePageContext(index);
    }
    return chat.handleSubmit(event, { experimental_attachments: [] });
  }

  onMount(() => {
    console.log(">>> chatId", chatId);
    if (chatId) return;
    chatsStore.createChat().then((chat) => {
      router?.navigate(`/chats/${chat.id}`);
    });
  });
</script>

{#if !user}
  <dialog class="modal modal-open">
    <div class="modal-box">
      <h3 class="text-lg font-bold">GrintAI</h3>
      <p class="py-4">
        In order to use the browser AI Agent, you need to sign in.
      </p>
      <div class="modal-action">
        <form method="dialog">
          <button
            class="btn btn-primary"
            onclick={() => router?.navigate("/sign-in")}>Sign In</button
          >
          <button class="btn" onclick={() => router?.navigate("/")}
            >Go Back</button
          >
        </form>
      </div>
    </div>
  </dialog>
{/if}

<Layout>
  <div class="fixed top-0 left-0 right-0 z-10">
    <ViewTitle title="GrintAI">
      {#snippet addon()}
        <div class="tooltip tooltip-bottom" data-tip="New Chat">
          <button class="btn btn-ghost btn-sm btn-square">
            <PlusIcon size={20} />
          </button>
        </div>
        <div class="tooltip tooltip-left" data-tip="Chat History">
          <button class="btn btn-ghost btn-sm btn-square">
            <HistoryIcon size={20} />
          </button>
        </div>
      {/snippet}
    </ViewTitle>
  </div>
  <div class="flex flex-col flex-1 p-2 gap-2 pt-16 pb-32">
    {#each chat.messages as message}
      {@const htmlContent = marked(message.content)}
      {#if message.role === "user"}
        <div class="chat chat-end">
          <div class="chat-bubble prose prose-sm">{@html htmlContent}</div>
        </div>
      {:else if message.role === "assistant"}
        {@const isXml = XMLValidator.validate(message.content) === true}
        {@const meta = isXml ? parser.parse(message.content) : {}}
        {#if isXml}
          <div class="prose prose-sm">{JSON.stringify(meta)}</div>
        {:else}
          <div class="prose prose-sm">{@html htmlContent}</div>
        {/if}
      {/if}
    {/each}
  </div>
  <div class="px-2 fixed bottom-14 left-0 right-0 bg-base-100">
    <PromptEditor
      {handleSubmit}
      {chat}
      {pageContexts}
      {attachPage}
      {removePageContext}
    />
  </div>
</Layout>
