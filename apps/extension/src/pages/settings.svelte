<script lang="ts">
  import Layout from "$lib/components/layout.svelte";
  import { appStore, THEME, type Theme } from "$lib/store/app.svelte";
  import { tabsStore } from "$lib/store/tabs.svelte";
  import { createForm } from "felte";
  import { ChevronLeftIcon, PlusIcon, XIcon } from "lucide-svelte";
  import { useRsv } from "@ryuz/rsv";
  import ViewTitle from "$lib/components/view-title.svelte";
  import { sendMessage } from "webext-bridge/popup";
  import SpaceColorPicker from "$lib/components/space-color-picker.svelte";

  const router = useRsv();

  const { form, data } = createForm({
    initialValues: {
      theme: appStore.data.theme ?? THEME.LIGHT,
    },
  });

  async function formChange() {
    appStore.data.theme = $data.theme as Theme;
    await appStore.persist();
  }

  async function onSpacesChanged() {
    // await spacesStore.persist();
  }

  async function deleteGroup(groupId: number) {
    await sendMessage("grinta_deleteGroup", { groupId }, "background");
  }

  function updateGroupTitle(groupId: number, title: string) {
    if (!title) return;
    if (title.length < 1 || title.length > 32) return;
    const group = tabsStore.groups.find((group) => group.id === groupId);
    if (!group) return;
    return sendMessage(
      "grinta_updateGroup",
      { groupId, color: group.color, title },
      "background",
    );
  }
</script>

<Layout>
  <ViewTitle title="Settings">
    {#snippet action()}
      <button
        class="btn btn-xs btn-ghost btn-square"
        onclick={() => router?.navigate("/")}
      >
        <ChevronLeftIcon size={20} />
      </button>
    {/snippet}
  </ViewTitle>
  <div class="flex flex-col p-2">
    <form use:form class="w-full flex flex-col gap-2" onchange={formChange}>
      <label for="theme" class="label">Theme</label>
      <select id="theme" name="theme" class="select w-full">
        {#each Object.keys(THEME) as theme}
          <option value={theme}>{theme.toLowerCase()}</option>
        {/each}
      </select>
    </form>
  </div>
  <div class="flex items-center justify-between p-2">
    <h1 class="text-lg font-semibold">Spaces</h1>
    <button
      class="btn btn-sm btn-ghost btn-square"
      onclick={() => tabsStore.addGroup()}
    >
      <PlusIcon size={20} />
    </button>
  </div>
  <form class="flex flex-col gap-2 p-2" onchange={onSpacesChanged}>
    {#each tabsStore.groups as space}
      <div class="flex gap-2 items-center">
        <SpaceColorPicker {space} />
        <input
          value={space.title}
          oninput={(event) =>
            updateGroupTitle(
              space.id,
              (event.target as HTMLInputElement)?.value ?? "",
            )}
          class="input w-full"
        />
        <button
          type="button"
          class="btn btn-sm btn-square"
          onclick={() => deleteGroup(space.id)}
        >
          <XIcon size={16} />
        </button>
      </div>
    {/each}
  </form>
</Layout>
