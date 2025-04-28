<script lang="ts">
  import Layout from "$lib/components/layout.svelte";
  import { appStore, THEME, type Theme } from "$lib/store/app.svelte";
  import { tabsStore } from "$lib/store/tabs.svelte";
  import { createForm } from "felte";
  import { ChevronLeftIcon, PlusIcon, TrashIcon } from "lucide-svelte";
  import { useRsv } from "@ryuz/rsv";

  const router = useRsv();

  const { form, data } = createForm({
    initialValues: {
      theme: appStore.data.theme ?? THEME.LIGHT,
      includeCurrentPage: appStore.data.includeCurrentPage ?? false,
    },
  });

  async function formChange() {
    appStore.data.theme = $data.theme as Theme;
    appStore.data.includeCurrentPage = $data.includeCurrentPage;
    await appStore.persist();
  }

  async function onSpacesChanged() {
    // await spacesStore.persist();
  }

  function addSpace() {
    // return spacesStore.addSpace({
    //   id: spacesStore.data.spaces.length,
    //   name: "Untitled",
    //   color: "blue",
    //   essentialTabs: [],
    //   tabs: [],
    // });
  }
</script>

<Layout>
  <div class="flex flex-col">
    <form use:form class="w-full flex flex-col gap-2" onchange={formChange}>
      <div class="flex gap-2 items-center">
        <button
          class="btn btn-sm btn-ghost btn-square"
          onclick={() => router?.navigate("/")}
        >
          <ChevronLeftIcon size={20} />
        </button>
        <h1 class="text-lg font-semibold">Settings</h1>
      </div>
      <label for="theme" class="label">Theme</label>
      <select id="theme" name="theme" class="select w-full">
        {#each Object.keys(THEME) as theme}
          <option value={theme}>{theme.toLowerCase()}</option>
        {/each}
      </select>
      <label for="includeCurrentPage" class="label"
        >Include current page in every GrintAI request</label
      >
      <input
        type="checkbox"
        id="includeCurrentPage"
        name="includeCurrentPage"
        class="toggle"
      />
    </form>
  </div>
  <div class="flex items-center justify-between mt-4">
    <h1 class="text-lg font-semibold">Spaces</h1>
    <button class="btn btn-sm btn-ghost btn-square" onclick={addSpace}>
      <PlusIcon size={20} />
    </button>
  </div>
  <form class="flex flex-col gap-2 mt-2" onchange={onSpacesChanged}>
    {#each tabsStore.groups as space}
      <div class="flex gap-2">
        <input bind:value={space.title} class="input input-sm w-full" />
        <button class="btn btn-sm btn-square">
          <TrashIcon size={16} />
        </button>
      </div>
    {/each}
  </form>
</Layout>
