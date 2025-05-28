<script lang="ts">
  import { sessionStorage } from "$lib/storage";
  import { HistoryIcon, PlusIcon } from "lucide-svelte";
  import Layout from "$lib/components/layout.svelte";
  import type { PageContext } from "$lib/types";
  import { useRsv } from "@ryuz/rsv";
  import ViewTitle from "$lib/components/view-title.svelte";
  import { Chat } from "@ai-sdk/svelte";
  import { type Attachment } from "ai";
  import { env } from "$lib/env";
  import { chatsStore } from "$lib/store/chats.svelte";
  import PromptEditor from "$lib/components/prompt-editor.svelte";
  import ChatMessages from "$lib/components/chat-messages.svelte";
  import { sendMessage } from "webext-bridge/popup";
  import { GetContentSchema } from "$lib/schema";
  import { takeLast, uniq } from "rambda";
  import { watch } from "runed";
  import pDebounce from "p-debounce";
  import dayjs from "dayjs";
  import { tabs } from "webextension-polyfill";
  import { Base64 } from "ox";
  import { tabsStore } from "$lib/store/tabs.svelte";
  import { onMount } from "svelte";
  import { authStore } from "$lib/store/auth.svelte";

  const router = useRsv();
  let chatId = $derived(router?.getParam("id"));
  const chatProperties = $derived(
    chatsStore.data.chats.find((chat) => chat.id === chatId),
  );
  const initialInput = $derived(router?.getQueryParam("input"));
  let initialMessages = $state<any[]>([]);
  let pageContexts = $state<PageContext[]>([]);
  const chromiumWebsite = $derived(
    tabsStore.currentTab?.url?.startsWith("chrome://"),
  );
  const lastChats = $derived(takeLast(3)(chatsStore.data.chats).reverse());
  const chatUrl = $derived(env.VITE_API_URL + "/api/ai/stream");
  const chat = $derived(
    new Chat({
      id: chatId,
      api: chatUrl,
      maxSteps: 3,
      sendExtraMessageFields: true,
      initialInput,
      onFinish: async (message) => {
        if (!chatId) return;
        if (!message.content) return;
        const titleRequest = await fetch(
          env.VITE_API_URL + "/api/ai/generate",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              prompt: message.content,
              context: "",
              contentType: "CHAT_TITLE",
            }),
          },
        );
        const { text } = (await titleRequest.json()) as { text: string };
        chatsStore.setTitle(chatId, text);
      },
      initialMessages,
      async onToolCall({ toolCall }) {
        if (toolCall.toolName === "clickElement") {
          const currentTab = (await sendMessage(
            "grinta_getCurrentTab",
            {},
            "background",
          )) as unknown as chrome.tabs.Tab;
          await sendMessage(
            "grinta_clickElement",
            { tabId: currentTab.id, selector: toolCall.args.selector },
            "background",
          );
          await chat.addToolResult({
            toolCallId: toolCall.toolCallId,
            result: true,
          });
        }
        if (toolCall.toolName === "getElements") {
          const currentTab = (await sendMessage(
            "grinta_getCurrentTab",
            {},
            "background",
          )) as unknown as chrome.tabs.Tab;
          const response = await sendMessage(
            "grinta_getElements",
            { tabId: currentTab.id },
            "background",
          );
          await chat.addToolResult({
            toolCallId: toolCall.toolCallId,
            result: response,
          });
        }
        if (toolCall.toolName === "fillElement") {
          const currentTab = (await sendMessage(
            "grinta_getCurrentTab",
            {},
            "background",
          )) as unknown as chrome.tabs.Tab;
          await sendMessage(
            "grinta_fillElement",
            {
              tabId: currentTab.id,
              selector: toolCall.args.selector,
              value: toolCall.args.value,
            },
            "background",
          );
          await chat.addToolResult({
            toolCallId: toolCall.toolCallId,
            result: true,
          });
        }
        if (toolCall.toolName === "scrollToElement") {
          const currentTab = (await sendMessage(
            "grinta_getCurrentTab",
            {},
            "background",
          )) as unknown as chrome.tabs.Tab;
          await sendMessage(
            "grinta_scrollToElement",
            { tabId: currentTab.id, selector: toolCall.args.selector },
            "background",
          );
          await chat.addToolResult({
            toolCallId: toolCall.toolCallId,
            result: true,
          });
        }
        if (toolCall.toolName === "getElement") {
          const currentTab = (await sendMessage(
            "grinta_getCurrentTab",
            {},
            "background",
          )) as unknown as chrome.tabs.Tab;
          const response = await sendMessage(
            "grinta_getElement",
            { tabId: currentTab.id, selector: toolCall.args.selector },
            "background",
          );
          await chat.addToolResult({
            toolCallId: toolCall.toolCallId,
            result: response,
          });
        }
      },
    }),
  );

  function attachPage(pageContext: PageContext) {
    const alreadyAttached = pageContexts.some(
      (pc) => pc.url === pageContext.url,
    );
    if (alreadyAttached) return;
    pageContexts.push(pageContext);
  }

  function removePageContext(index: number) {
    pageContexts.splice(index, 1);
  }

  async function handleSubmit(event?: SubmitEvent) {
    const persistedPageContexts = await sessionStorage.getItem("pageContexts");
    if (persistedPageContexts) {
      pageContexts = JSON.parse(persistedPageContexts);
      await sessionStorage.removeItem("pageContexts");
    }
    if (chat.status !== "ready") return;
    const currentTab = (await sendMessage(
      "grinta_getCurrentTab",
      {},
      "background",
    )) as unknown as chrome.tabs.Tab;
    const input = chat.input;
    if (!input.trim()) return;
    chat.input = "";
    if (!chatId) {
      const chat = await chatsStore.createChat();
      await sessionStorage.setItem(
        "pageContexts",
        JSON.stringify(pageContexts),
      );
      return router?.navigate(
        `/chats/${chat.id}?input=${encodeURIComponent(input)}`,
      );
    }
    chat.input = input;
    let screenshot: string | undefined;
    if (pageContexts.length === 0) {
      const response = await sendMessage(
        "grinta_fetchPage",
        { tabId: currentTab.id },
        "background",
      );
      const currentPageContext = GetContentSchema.parse(response);
      attachPage(currentPageContext);
      screenshot = await tabs.captureVisibleTab(undefined, {
        quality: 10,
      });
    }
    let attachments: Array<Attachment> = [];
    for (const pageContext of pageContexts) {
      const pathname = new URL(pageContext.url).pathname;
      attachments.push({
        name: encodeURIComponent(pathname) + ".txt",
        contentType: "text/plain",
        url: "data:text/plain;base64," + Base64.fromString(pageContext.content),
      });
    }
    if (screenshot) {
      attachments.push({
        name: "screenshot.jpeg",
        contentType: "image/jpeg",
        url: screenshot,
      });
    }
    await chat.handleSubmit(event, {
      experimental_attachments: uniq(attachments),
    });
    pageContexts = [];
  }

  const debouncedSubmit = pDebounce(handleSubmit, 100);

  async function summarize() {
    chat.input = "Summarize current tab";
    await debouncedSubmit();
  }

  $effect(() => {
    if (router?.path === "/chats") return;
    if (!chatId) return;
    if (!initialInput) return;
    if (chat.messages.length !== 0) return;
    if (chat.status !== "ready") return;
    sessionStorage.getItem("pageContexts").then((persistedPageContexts) => {
      if (persistedPageContexts) {
        pageContexts = JSON.parse(persistedPageContexts);
        return sessionStorage.removeItem("pageContexts");
      }
    });
    debouncedSubmit();
  });

  watch(
    () => router?.path,
    () => {
      if (router?.path !== "/chats") return;
      initialMessages = [];
    },
  );

  watch(
    () => chatId,
    () => {
      if (!chatId) return;
      if (initialMessages.length !== 0) return;
      initialMessages = chatsStore.getMessages(chatId);
    },
  );

  watch(
    () => chat.messages,
    () => {
      if (!chatId) return;
      if (router?.path === "/chats") return;
      chatsStore.setMessages(chatId, chat.messages);
    },
  );

  onMount(() => {
    authStore.fetchSession();
  });
</script>

{#if !authStore.user}
  <dialog class="modal modal-open">
    <div class="modal-box">
      <h3 class="text-lg font-bold">GrintAI</h3>
      <p class="py-4">
        In order to use the browser AI Agent, you need to sign in.
      </p>
      <div class="modal-action">
        <form method="dialog">
          <a
            class="btn btn-primary"
            href="https://getgrinta.com/sign-in"
            target="_blank"
            rel="noopener noreferrer">Sign In</a
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
    <ViewTitle title={chatProperties?.title ?? "GrintAI"}>
      {#snippet addon()}
        {#if chatId}
          <div class="tooltip tooltip-bottom" data-tip="New Chat">
            <button
              class="btn btn-ghost btn-sm btn-square"
              onclick={() => router?.navigate("/chats")}
            >
              <PlusIcon size={20} />
            </button>
          </div>
        {/if}
        <div class="tooltip tooltip-left" data-tip="Chat History">
          <button
            class="btn btn-ghost btn-sm btn-square"
            onclick={() => router?.navigate("/history")}
          >
            <HistoryIcon size={20} />
          </button>
        </div>
      {/snippet}
    </ViewTitle>
  </div>
  {#if chatId && chat.messages.length > 0}
    <ChatMessages messages={chat.messages} status={chat.status} />
  {:else}
    <div class="flex-1 flex flex-col items-start justify-center gap-4 p-2">
      <h1 class="text-lg font-semibold">Surf with GrintAI</h1>
      <p>Chat with the website content or let the agent do it for you</p>
      {#if lastChats.length > 0}
        <ul class="w-full flex flex-col gap-2">
          <h2 class="font-semibold">Past Chats</h2>
          {#each lastChats as chat}
            <li class="w-full">
              <button
                class="btn btn-sm w-full justify-between"
                onclick={() => router?.navigate("/chats/" + chat.id)}
              >
                <span
                  class="truncate max-w-[14rem] w-full text-left whitespace-nowrap"
                  >{chat.title}</span
                >
                <span class="text-xs whitespace-nowrap">
                  {dayjs(chatsStore.getChatUpdatedAt(chat.id)).fromNow()}
                </span>
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}
  <div
    class="flex flex-col px-2 pb-2 fixed bottom-14 left-0 right-0 bg-base-100 gap-2"
  >
    {#if !chatId && !chromiumWebsite}
      <div class="flex gap-2">
        <div class="tooltip tooltip-right" data-tip="Summarize content">
          <button class="btn btn-sm" onclick={summarize}>Summarize</button>
        </div>
      </div>
    {/if}
    <PromptEditor
      {handleSubmit}
      {chat}
      {pageContexts}
      {attachPage}
      {removePageContext}
    />
  </div>
</Layout>
