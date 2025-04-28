<script lang="ts">
  import { authClient } from "$lib/auth";
  import Layout from "$lib/components/layout.svelte";
  import { useRsv } from "@ryuz/rsv";
  import { CogIcon } from "lucide-svelte";

  const router = useRsv();

  const session = authClient.useSession();
  const user = $derived($session.data?.user);
</script>

<Layout>
  <div class="flex justify-end">
    <button
      class="btn btn-ghost btn-square"
      onclick={() => router?.navigate("/settings")}
    >
      <CogIcon size={20} />
    </button>
  </div>
  <div class="flex-1 flex flex-col items-center justify-center">
    <div class="w-full flex flex-col gap-2">
      <h1 class="text-lg font-semibold">Profile</h1>
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
