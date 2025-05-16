<script lang="ts">
  import Layout from "$lib/components/layout.svelte";
  import ViewTitle from "$lib/components/view-title.svelte";
  import { chatsStore, type ChatData } from "$lib/store/chats.svelte";
  import { useRsv } from "@ryuz/rsv";
  import { ChevronLeftIcon, TrashIcon } from "lucide-svelte";
  import { groupBy } from "rambda";
  import dayjs from "dayjs";
  const router = useRsv();

  type ChatDataWithUpdatedAt = ChatData & {
    updatedAt: string;
  };

  function addUpdatedAt(chat: ChatData): ChatDataWithUpdatedAt {
    const updatedAt = dayjs(chatsStore.getChatUpdatedAt(chat.id)).format("LL");
    return {
      ...chat,
      updatedAt,
    };
  }

  const chatsByDay = $derived(
    groupBy((chat: ChatDataWithUpdatedAt) => chat.updatedAt)(
      chatsStore.data.chats.map(addUpdatedAt),
    ),
  );
</script>

<Layout>
  <div class="fixed top-0 left-0 right-0 z-10">
    <ViewTitle title="Chats">
      {#snippet action()}
        <button
          class="btn btn-ghost btn-sm btn-square"
          onclick={() => router?.navigate("/chats")}
        >
          <ChevronLeftIcon size={20} />
        </button>
      {/snippet}
    </ViewTitle>
  </div>
  <div class="flex-1 flex flex-col p-2 pt-16">
    {#each Object.entries(chatsByDay).reverse() ?? [] as [date, chats]}
      <h2 class="my-1">{date}</h2>
      {#each chats?.reverse() as chat}
        <div class="flex border-b border-base-300 group">
          <button
            class="btn btn-ghost rounded-none flex-1 justify-start truncate"
            onclick={() => router?.navigate(`/chats/${chat.id}`)}
            >{chat.title}</button
          >
          <button
            class="btn btn-square btn-ghost rounded-none hidden group-hover:flex"
            onclick={() => chatsStore.deleteChat(chat.id)}
          >
            <TrashIcon size={16} />
          </button>
        </div>
      {/each}
    {/each}
  </div>
</Layout>
