<script lang="ts">
  import packageJson from "../../package.json";
  import Layout from "$lib/components/layout.svelte";
  import { appStore, THEME, type Theme } from "$lib/store/app.svelte";
  import { tabsStore } from "$lib/store/tabs.svelte";
  import { createForm } from "felte";
  import { ChevronLeftIcon, PlusIcon, XIcon } from "lucide-svelte";
  import { useRsv } from "@ryuz/rsv";
  import ViewTitle from "$lib/components/view-title.svelte";
  import { sendMessage } from "webext-bridge/popup";
  import SpaceColorPicker from "$lib/components/space-color-picker.svelte";
  import { watch } from "runed";

  const router = useRsv();

  const { form, data } = createForm({
    initialValues: {
      theme: appStore.data.theme ?? THEME.LIGHT,
      syncEncryptionKey: appStore.data.syncEncryptionKey,
    },
  });

  async function formChange() {
    appStore.data.theme = $data.theme as Theme;
    appStore.data.syncEncryptionKey = $data.syncEncryptionKey;
    await appStore.persist();
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

  watch(
    () => $data.syncEncryptionKey,
    () => {
      appStore.data.syncEncryptionKey = $data.syncEncryptionKey;
      appStore.persist();
    },
  );
</script>

<Layout>
  <form use:form onchange={formChange} class="flex flex-col">
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
      <div class="w-full flex flex-col gap-2">
        <label for="theme" class="label">Theme</label>
        <select id="theme" name="theme" class="select w-full">
          {#each Object.keys(THEME) as theme}
            <option value={theme}>{theme.toLowerCase()}</option>
          {/each}
        </select>
      </div>
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
    <div class="flex flex-col gap-2 p-2">
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
    </div>
    <div class="flex flex-col gap-2 p-2">
      <div class="flex justify-between items-center mt-4">
        <h2 class="text-lg font-semibold">Smart Actions</h2>
        <button class="btn btn-square btn-sm" disabled>
          <PlusIcon />
        </button>
      </div>
      <p>Add site specific actions</p>
      <button class="btn" disabled>Summarize</button>
    </div>
    <div class="flex flex-col gap-2 p-2" onchange={formChange}>
      <h2 class="text-lg font-semibold">Sync Encryption Key</h2>
      <p>Sync encryption key is used to encrypt your sync data</p>
      <textarea
        class="textarea resize-none"
        bind:value={appStore.data.syncEncryptionKey}
      ></textarea>
      <button class="btn" onclick={() => appStore.regenerateMnemonic()}
        >Regenerate</button
      >
    </div>
    <div class="flex flex-col gap-2 p-2">
      <h2 class="text-lg font-semibold">About</h2>
      <p>Version {packageJson.version}</p>
      <a
        class="link"
        href="https://grnt.me/docs"
        target="_blank"
        rel="noopener noreferrer">Documentation</a
      >
      <a
        class="link"
        href="https://grnt.me/support"
        target="_blank"
        rel="noopener noreferrer">Support</a
      >
      <a
        class="link"
        href="https://getgrinta.com/privacy-policy"
        target="_blank"
        rel="noopener noreferrer">Privacy Policy</a
      >
      <a
        class="link"
        href="https://getgrinta.com/terms-of-service"
        target="_blank"
        rel="noopener noreferrer">Terms of Service</a
      >
    </div>
  </form>
</Layout>
