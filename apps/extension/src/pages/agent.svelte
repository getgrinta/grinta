<script lang="ts">
  import {
    CornerDownLeftIcon,
    FileIcon,
    Settings2Icon,
    XIcon,
  } from "lucide-svelte";
  import Layout from "$lib/components/layout.svelte";
  import { sendMessage } from "webext-bridge/popup";
  import AttachmentPicker from "$lib/components/attachment-picker.svelte";
  import { createForm } from "felte";
  import { GetContentSchema } from "$lib/schema";
  import type { Attachment } from "$lib/types";
  import { tabsStore } from "$lib/store/tabs.svelte";
  import { useRsv } from "@ryuz/rsv";
  import { authClient } from "$lib/auth";

  const router = useRsv();
  const session = authClient.useSession();
  const user = $derived($session.data?.user);

  const { form, handleSubmit, addField, data, unsetField } = createForm({
    onSubmit(data) {
      console.log(">>>S", data);
    },
    initialValues: {
      prompt: "",
      attachments: [] as Attachment[],
    },
  });

  async function fetchTab(tabId: number) {
    const { content } = GetContentSchema.parse(
      await sendMessage("grinta_fetchPage", { tabId }, "background"),
    );
    attachTab({ tabId, content });
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Enter" && event.metaKey) {
      event.preventDefault();
      handleSubmit();
    }
  }

  function attachTab(attachment: Attachment) {
    addField("attachments", attachment);
  }
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
  <div class="flex-1 flex flex-col items-center justify-center gap-2">
    <h1 class="text-xl font-semibold">GrintAI</h1>
    <p class="text-lg max-w-[20rem] w-full text-center">
      Ask questions about the current page or tell us to open a new tab.
    </p>
  </div>
  <form use:form class="flex flex-col items-end justify-center gap-2">
    <div class="flex w-full justify-between items-center gap-1">
      <div class="flex flex-1 gap-2 items-center">
        {#each $data.attachments as attachment, i}
          <div
            class="tooltip tooltip-right"
            data-tip={tabsStore.tabs
              .find((tab) => tab.id === attachment.tabId)
              ?.title?.substring(0, 16)}
          >
            <button
              class="btn btn-sm btn-square btn-ghost group"
              onclick={() => unsetField(`attachments.${i}`)}
            >
              <FileIcon size={16} class="flex group-hover:hidden" />
              <XIcon size={16} class="hidden group-hover:flex" />
            </button>
          </div>
        {/each}
      </div>
      <AttachmentPicker {fetchTab} />
    </div>
    <div class="relative w-full">
      <textarea
        name="prompt"
        class="textarea resize-none w-full"
        onkeydown={handleKeyDown}
      ></textarea>
      <div class="flex absolute right-2 top-2">
        <button type="submit" class="btn btn-sm btn-ghost btn-square">
          <CornerDownLeftIcon size={16} />
        </button>
      </div>
    </div>
  </form>
</Layout>
