<script lang="ts">
  import { authClient } from "$lib/auth";
  import Layout from "$lib/components/layout.svelte";
  import ViewTitle from "$lib/components/view-title.svelte";
  import { useRsv } from "@ryuz/rsv";
  import { CogIcon } from "lucide-svelte";

  const router = useRsv();

  const session = authClient.useSession();
  const user = $derived($session.data?.user);
</script>

<Layout>
  <ViewTitle title="Profile">
    {#snippet addon()}
      <button
        class="btn btn-ghost btn-sm btn-square"
        onclick={() => router?.navigate("/settings")}
      >
        <CogIcon size={20} />
      </button>
    {/snippet}
  </ViewTitle>
  <div class="flex-1 flex flex-col items-center justify-center p-2">
    <div class="w-full flex flex-col gap-2">
      <label for="email" class="label">Email</label>
      <input
        id="email"
        name="email"
        type="email"
        class="input w-full"
        value={user?.email ?? ""}
        disabled
      />
      <button class="btn btn-primary" onclick={() => authClient.signOut()}
        >Sign Out</button
      >
    </div>
  </div>
</Layout>
